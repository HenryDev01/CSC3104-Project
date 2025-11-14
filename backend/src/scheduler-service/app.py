import threading
from flask import Flask, jsonify, request
from flask_cors import CORS
from confluent_kafka import Producer, Consumer, KafkaError
import grpc
from concurrent import futures
import doctor_pb2
import doctor_pb2_grpc
import mysql.connector
import os
import json
import logging
from datetime import datetime, timedelta, date, time
from typing import List, Dict, Optional
import heapq
from dataclasses import dataclass
from prometheus_client import start_http_server, Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST


REQUEST_COUNT = Counter(
    'scheduler_request_count',
    'Total number of requests',
    ['method', 'endpoint']
)

REQUEST_LATENCY = Histogram(
    'scheduler_request_latency_seconds',
    'Latency of requests in seconds',
    ['endpoint']
)




# Configuration

PRIORITY_WINDOWS = {
    'P1': 6 * 7,       # 6 weeks → 42 days
    'P2': 12 * 7,      # 12 weeks → 84 days
    'P3': 6 * 30,      # 6 months → ~180 days
    'P4': 365          # 1 year
}

SLOT_INTERVAL_MINUTES = 30

KAFKA_BOOTSTRAP = 'kafka:9092'
RISK_CLASSIFICATION_TOPIC = 'ai.risk.classifications'
SCHEDULING_TOPIC = 'appointment.scheduled'

producer = Producer({"bootstrap.servers": "kafka:9092"})

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def track_metrics(endpoint_name):
    def decorator(f):
        def wrapper(*args, **kwargs):
            REQUEST_COUNT.labels(method=request.method, endpoint=endpoint_name).inc()
            with REQUEST_LATENCY.labels(endpoint=endpoint_name).time():
                return f(*args, **kwargs)
        wrapper.__name__ = f.__name__
        return wrapper
    return decorator

@app.route('/metrics')
def metrics():
    return generate_latest(), 200, {'Content-Type': CONTENT_TYPE_LATEST}


# Data structures
@dataclass
class Patient:
    patient_id: str
    priority_group: str  # P1, P2, P3, P4
    priority_score: float
    risk_data: dict
    stability: str
    timestamp: str

    def __lt__(self, other):
        priority_order = {'P1': 1, 'P2': 2, 'P3': 3, 'P4': 4}
        if priority_order[self.priority_group] != priority_order[other.priority_group]:
            return priority_order[self.priority_group] < priority_order[other.priority_group]
        return self.priority_score > other.priority_score


# In-memory storage
patient_queue = []  # Priority queue (heap)
scheduled_appointments = []  # List of scheduled appointments


def get_db_connection():
    return mysql.connector.connect(
        host=os.getenv("DB_HOST", "scheduler-db"),
        port=int(os.getenv("DB_PORT", 3306)),
        user=os.getenv("DB_USER", "user"),
        password=os.getenv("DB_PASSWORD", "pass123"),
        database=os.getenv("DB_NAME", "Project")
    )


def is_weekend(date: datetime) -> bool:
    """Check if date is Saturday (5) or Sunday (6)"""
    return date.weekday() >= 5


from datetime import datetime, timedelta
from typing import Optional, Tuple


def get_next_available_slot(priority_group: str) -> Optional[Tuple[int, datetime]]:
    if priority_group not in PRIORITY_WINDOWS:
        raise ValueError(f"Invalid priority group: {priority_group}")

    today = datetime.now().date()
    now = datetime.now()

    # Define the priority booking rules
    if priority_group == "P1":
        start_date = today
        end_date = today + timedelta(weeks=4)
    elif priority_group == "P2":
        start_date = today + timedelta(weeks=4)
        end_date = start_date + timedelta(weeks=4)
    elif priority_group == "P3":
        start_date = today + timedelta(days=60)  # approx 3 months
        end_date = start_date + timedelta(weeks=4)
    elif priority_group == "P4":
        start_date = today + timedelta(days=100)
        end_date = start_date + timedelta(weeks=4)
    else:
        raise ValueError(f"Invalid priority group: {priority_group}")

    db = get_db_connection()
    cursor = db.cursor(dictionary=True)

    cursor.execute("""
        SELECT da.doctor_id, da.date, da.start_time
        FROM DoctorAvailability da
        LEFT JOIN Appointment a
            ON a.doctor_id = da.doctor_id
           AND a.scheduled_date = da.date
           AND a.scheduled_time = da.start_time
        WHERE da.available = TRUE
          AND da.date >= %s  -- ⬅️ Ensure date is today or later
          AND da.date BETWEEN %s AND %s
          AND a.appointment_id IS NULL
          AND WEEKDAY(da.date) < 5  -- skip weekends
          AND (
              da.date > %s  -- ⬅️ Future dates are OK
              OR (da.date = %s AND da.start_time > %s)  -- ⬅️ Today but time must be in future
          )
        ORDER BY da.date ASC, da.start_time ASC
        LIMIT 1
    """, (today, start_date, end_date, today, today, now.time()))

    slot = cursor.fetchone()
    cursor.close()
    db.close()

    if slot:
        slot_time = (datetime.min + slot['start_time']).time()
        slot_datetime = datetime.combine(slot['date'], slot_time)
        return slot['doctor_id'], slot_datetime
    else:
        logger.warning(f"No available slots for priority {priority_group} "
                       f"between {start_date} and {end_date}")
        return None

def schedule_appointment(patient: Patient) -> Optional[Dict]:
    """
    Schedule an appointment for a patient in the next available slot.
    Prevents rescheduling if the patient already has an active appointment.
    """
    logger.info(f"🩺 Attempting to schedule appointment for patient {patient.patient_id}")

    try:
        db = get_db_connection()
        cursor = db.cursor(dictionary=True)

        cursor.execute("""
            SELECT appointment_id, scheduled_date, scheduled_time
            FROM Appointment
            WHERE patient_id = %s AND status = 'scheduled'
            LIMIT 1
        """, (patient.patient_id,))
        existing = cursor.fetchone()

        if existing:
            logger.warning(
                f"⚠️ Patient {patient.patient_id} already has a scheduled appointment "
                f"on {existing['scheduled_date']} at {existing['scheduled_time']}"
            )
            cursor.close()
            return None

        # 2️⃣ Get the next available slot
        doctor_id, slot_time = get_next_available_slot(patient.priority_group)
        if slot_time is None:
            logger.warning(f"❌ No available slot found for patient {patient.patient_id}")
            cursor.close()
            return None

        appointment = {
            'patient_id': patient.patient_id,
            'doctor_id': doctor_id,
            'priority_group': patient.priority_group,
            'priority_score': patient.priority_score,
            'stability': patient.stability,
            'scheduled_date': slot_time.date(),
            'scheduled_time': slot_time.time(),
            'status': 'scheduled',
            'created_at': datetime.now()
        }

        cursor.execute("""
            INSERT INTO Appointment
            (patient_id, doctor_id, scheduled_date, scheduled_time,
             priority_group, priority_score, stability, status, created_at)
            VALUES (%(patient_id)s, %(doctor_id)s, %(scheduled_date)s, %(scheduled_time)s,
                    %(priority_group)s, %(priority_score)s, %(stability)s, %(status)s, %(created_at)s)
        """, appointment)
        db.commit()

        appointment['appointment_id'] = cursor.lastrowid
        scheduled_appointments.append(appointment)

        cursor.execute("""
            UPDATE DoctorAvailability
            SET available = FALSE
            WHERE doctor_id = %s AND date = %s AND start_time = %s
        """, (
            appointment['doctor_id'],
            appointment['scheduled_date'],
            appointment['scheduled_time']
        ))
        db.commit()

        logger.info(f"✅ Appointment scheduled for patient {patient.patient_id} at {slot_time}")

        return appointment

    except mysql.connector.Error as e:
        logger.error(f"❌ Database error scheduling appointment: {e}")
        return None

    finally:
        cursor.close()
        db.close()



def determine_priority(riskGroup):
    """
    Determine priority group (P1-P4) based on risk scores
    Returns: (priority_group, priority_score, stability)
    """

    # Determine priority group based on risk level
    if riskGroup == "P1":
        stability = "Critical"
        priority_score = 4
    elif riskGroup == "P2":
        stability = "Unstable"
        priority_score = 3
    elif riskGroup == "P3":
        stability = "Moderately Stable"
        priority_score = 2
    else:
        stability = "Stable"
        priority_score = 1

    return stability, priority_score



@app.route('/api/scheduler/process-risk', methods=['POST'])
@track_metrics("process_risk_once")
def process_risk_once():
    """Fetch messages from Kafka and schedule patients once"""

    request_data = request.get_json()
    target_patient_id = request_data.get("patient_id")  # the patient to process
    risk_data = request_data.get("risk_data")
    riskGroup = risk_data.get("riskGroup")
    logger.info(risk_data)
    processed_patients = []

    stability,priority_score = determine_priority(riskGroup)

    patient = Patient(
        patient_id=target_patient_id,
        priority_group=riskGroup,
        priority_score=priority_score,
        risk_data=risk_data,
        stability=stability,
        timestamp=datetime.now().isoformat()
    )
    appointment = schedule_appointment(patient)
    processed_patients.append(target_patient_id)

    return jsonify({
        "processed_patients": processed_patients,
        "queue_size": len(processed_patients)
    })




@app.route('/api/scheduler/add_queue', methods=['POST'])
@track_metrics("add_to_queue")
def add_to_queue():
    try:
        data = request.json
        patient_id = data.get('patient_id')
        risk_data = data.get('risk_data')
        riskGroup = risk_data.get("riskGroup")

        logger.info(risk_data)
        stability,priority_score = determine_priority(riskGroup)

        if not patient_id or not riskGroup:
            return jsonify({
                'success': False,
                'error': 'patient_id and priority_group are required'
            }), 400

        if riskGroup not in ['P1', 'P2', 'P3', 'P4']:
            return jsonify({
                'success': False,
                'error': 'priority_group must be P1, P2, P3, or P4'
            }), 400

        db = get_db_connection()
        cursor = db.cursor(dictionary=True)

        # Check if patient already has a scheduled appointment
        cursor.execute("""
            SELECT * FROM Appointment
            WHERE patient_id = %s AND status = 'scheduled'
        """, (patient_id,))
        existing_appointment = cursor.fetchone()

        if existing_appointment:
            cursor.close()
            db.close()
            logger.warning(f"Patient {patient_id} already has a scheduled appointment.")
            return jsonify({
                'success': False,
                'error': f'Patient {patient_id} already has a scheduled appointment on '
                         f"{existing_appointment['scheduled_date']} at {existing_appointment['scheduled_time']}"
            }), 400

        # Add to queue (insert or update)
        cursor.execute("""
            INSERT INTO PatientQueue 
            (patient_id, priority_group, priority_score, stability)
            VALUES (%s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                priority_group = VALUES(priority_group),
                priority_score = VALUES(priority_score),
                stability = VALUES(stability),
                created_at = CURRENT_TIMESTAMP
        """, (
            patient_id,
            riskGroup,
            priority_score,
            stability
        ))

        db.commit()
        cursor.close()
        db.close()

        logger.info(f"Added patient {patient_id} to queue with priority {riskGroup}")

        return jsonify({
            'success': True,
            'message': f'Patient {patient_id} added to queue successfully'
        }), 200

    except Exception as e:
        logger.error(f"Error adding to queue: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# REST API Endpoints


@app.route('/health', methods=['GET'])
@track_metrics("health_check")
def health_check():
    return jsonify({
        'service': 'scheduler-service',
        'status': 'healthy',
        'timestamp': datetime.now().isoformat()
    })


@app.route('/api/scheduler/stats', methods=['GET'])
@track_metrics("get_stats")
def get_stats():
    """Get scheduler statistics"""
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)

    # Active appointments (status = 'scheduled')
    cursor.execute("SELECT COUNT(*) AS active FROM Appointment WHERE status = 'scheduled'")
    active_appointments = cursor.fetchone()['active']

    # Total scheduled appointments
    cursor.execute("SELECT COUNT(*) AS total FROM Appointment")
    total_scheduled = cursor.fetchone()['total']

    cursor.execute("""
        SELECT priority_group, COUNT(*) AS count
        FROM PatientQueue
        GROUP BY priority_group
    """)

    priority_dist = {row['priority_group']: row['count'] for row in cursor.fetchall()}

    cursor.close()
    db.close()

    return jsonify({
        'queue_size': len(patient_queue),
        'scheduled_appointments': total_scheduled,
        'active_appointments': active_appointments,
        'priority_distribution': priority_dist
    })





@app.route('/api/scheduler/queue', methods=['GET'])
@track_metrics("get_queue")
def get_queue():
    """Get current patient queue from database"""
    try:
        db = get_db_connection()
        cursor = db.cursor(dictionary=True)

        cursor.execute("""
            SELECT patient_id, priority_group, priority_score, stability, created_at
            FROM PatientQueue
            ORDER BY created_at ASC
        """)

        queue_list = cursor.fetchall()

        cursor.close()
        db.close()

        # Convert risk_data from JSON string to Python dict
        # for patient in queue_list:
        #     if patient["risk_data"]:
        #         patient["risk_data"] = json.loads(patient["risk_data"])

        return jsonify({
            'patients': queue_list,
            'queue_size': len(queue_list)
        })

    except Exception as e:
        return jsonify({
            'error': str(e)
        }), 500




@app.route('/api/scheduler/appointments', methods=['GET'])
@track_metrics("get_appointments")
def get_appointments():
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    cursor.execute("""
        SELECT *
        FROM Appointment
        ORDER BY scheduled_date ASC, scheduled_time ASC
    """)
    appointments = cursor.fetchall()
    cursor.close()
    db.close()

    # Convert any datetime or timedelta fields to JSON-safe formats
    for appt in appointments:
        for k, v in appt.items():
            if isinstance(v, datetime):
                appt[k] = v.isoformat()  # converts datetime to ISO string
            elif isinstance(v, timedelta):
                appt[k] = v.total_seconds()  # converts timedelta to seconds

    return jsonify({
        'appointments': appointments,
        'count': len(appointments)
    })

@app.route('/api/scheduler/appointments/date/<date>', methods=['GET'])
@track_metrics("get_appointments_by_date")
def get_appointments_by_date(date):
    """Get appointments for a specific date (YYYY-MM-DD) from the database"""
    try:
        target_date = datetime.fromisoformat(date).date()

        conn = get_db_connection()  # your function that returns a DB connection
        cursor = conn.cursor(dictionary=True)

        query = """
            SELECT 
                a.appointment_id,
                a.patient_id,
                a.doctor_id,
                a.scheduled_date,
                a.scheduled_time,
                a.priority_group,
                a.priority_score,
                a.stability,
                a.status,
                a.created_at,
                a.updated_at,
                d.name AS doctor_name
            FROM Appointment a
            JOIN Doctor d ON a.doctor_id = d.doctor_id
            WHERE a.scheduled_date = %s
            ORDER BY a.scheduled_time ASC
        """
        cursor.execute(query, (target_date,))
        date_appointments = cursor.fetchall()

        cursor.close()
        conn.close()

        return jsonify({
            'date': str(target_date),
            'appointments': date_appointments,
            'count': len(date_appointments)
        })

    except ValueError:
        return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
    except Exception as e:
        print(f"Error fetching appointments: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/scheduler/schedule-next', methods=['POST'])
@track_metrics("schedule_next")
def schedule_next():
    """Manually schedule the next patient in queue"""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        # Get highest priority patient from database (not in-memory queue)
        cursor.execute("""
             SELECT patient_id, priority_group, priority_score, stability, risk_data, created_at
             FROM PatientQueue
             ORDER BY 
                 FIELD(priority_group, 'P1', 'P2', 'P3', 'P4'),
                 priority_score DESC,
                 created_at ASC
             LIMIT 1
         """)

        patient_row = cursor.fetchone()

        if not patient_row:
            return jsonify({'error': 'Queue is empty'}), 400

        # Convert database row to Patient dataclass
        patient = Patient(
            patient_id=patient_row['patient_id'],
            priority_group=patient_row['priority_group'],
            priority_score=float(patient_row['priority_score']) if patient_row['priority_score'] else 0.0,
            risk_data=json.loads(patient_row['risk_data']) if patient_row['risk_data'] else {},
            stability=patient_row['stability'] if patient_row['stability'] else 'unknown',
            timestamp=patient_row['created_at'].isoformat()
            if isinstance(patient_row['created_at'], (datetime, date))
            else str(patient_row['created_at'])
            if patient_row['created_at']
            else datetime.now().isoformat()

        )

        # Find next available slot
        appointment = schedule_appointment(patient)

        if appointment:
            # Remove patient from queue
            cursor.execute("""
                 DELETE FROM PatientQueue 
                 WHERE patient_id = %s
             """, (patient_row['patient_id'],))

            conn.commit()

            return json.dumps({
                'message': 'Patient scheduled successfully',
                'appointment': appointment
            }, default=str), 200
        else:
            # Patient stays in queue if scheduling failed
            return jsonify({'error': 'No available slots'}), 500

    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@app.route('/api/scheduler/schedule-batch', methods=['POST'])
@track_metrics("schedule_batch")
def schedule_batch():
    """Schedule multiple patients from the database queue at once"""
    data = request.get_json() or {}
    batch_size = data.get('batch_size', 5)

    scheduled_count = 0
    failed_count = 0
    scheduled_batch_appointments = []

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        # Fetch up to batch_size patients from DB, ordered by priority
        cursor.execute(f"""
            SELECT patient_id, priority_group, priority_score, stability, risk_data, created_at
            FROM PatientQueue
            ORDER BY 
                FIELD(priority_group, 'P1', 'P2', 'P3', 'P4'),
                priority_score DESC,
                created_at ASC
            LIMIT %s
        """, (batch_size,))
        patients_rows = cursor.fetchall()

        if not patients_rows:
            return jsonify({'error': 'Queue is empty'}), 400

        for patient_row in patients_rows:
            # Convert DB row to Patient
            patient = Patient(
                patient_id=patient_row['patient_id'],
                priority_group=patient_row['priority_group'],
                priority_score=float(patient_row['priority_score']) if patient_row['priority_score'] else 0.0,
                risk_data=json.loads(patient_row['risk_data']) if patient_row['risk_data'] else {},
                stability=patient_row['stability'] if patient_row['stability'] else 'unknown',
                timestamp=patient_row['created_at'].isoformat()
                if isinstance(patient_row['created_at'], (datetime, date))
                else str(patient_row['created_at'])
                if patient_row['created_at']
                else datetime.now().isoformat()
            )

            # Schedule appointment
            appointment = schedule_appointment(patient)

            if appointment:
                scheduled_count += 1
                scheduled_batch_appointments.append(appointment)

                # Remove patient from queue
                cursor.execute("""
                    DELETE FROM PatientQueue
                    WHERE patient_id = %s
                """, (patient_row['patient_id'],))
                conn.commit()
            else:
                failed_count += 1

        # Serialize appointments safely
        for appt in scheduled_batch_appointments:
            for k, v in appt.items():
                if isinstance(v, (datetime, date, time)):
                    appt[k] = v.isoformat()

        return jsonify({
            'scheduled_count': scheduled_count,
            'failed_count': failed_count,
            'scheduled_appointments': scheduled_batch_appointments
        }), 200

    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@app.route('/api/scheduler/availability', methods=['GET'])
def get_availability():
    """Get doctor availability for a specific date"""
    date_str = request.args.get('date')  # YYYY-MM-DD format

    if not date_str:
        return jsonify({'error': 'Date parameter required'}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT 
                da.availability_id,
                da.doctor_id,
                da.date,
                da.start_time,
                da.end_time,
                da.available,
                d.name as doctor_name,
                d.specialization
            FROM DoctorAvailability da
            JOIN Doctor d ON da.doctor_id = d.doctor_id
            WHERE da.date = %s
            ORDER BY da.start_time ASC, da.doctor_id ASC
        """, (date_str,))

        availability = cursor.fetchall()
        logger.info(availability)
        logger.info(date_str)


        # Convert time objects to seconds or HH:MM format
        for slot in availability:
            if slot['start_time']:
                # Convert timedelta to total seconds if needed
                if isinstance(slot['start_time'], timedelta):
                    slot['start_time'] = int(slot['start_time'].total_seconds())
                else:
                    slot['start_time'] = str(slot['start_time'])

            if slot['end_time']:
                if isinstance(slot['end_time'], timedelta):
                    slot['end_time'] = int(slot['end_time'].total_seconds())
                else:
                    slot['end_time'] = str(slot['end_time'])

            if slot['date']:
                slot['date'] = slot['date'].isoformat()


        return jsonify({
            'date': date_str,
            'availability': availability,
            'total_slots': len(availability)
        })

    finally:
        cursor.close()
        conn.close()

@app.route('/api/scheduler/cancel/<patient_id>', methods=['POST'])
def cancel_appointment(patient_id):
    """Cancel an appointment in the database"""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        # Find the scheduled appointment for the patient
        cursor.execute("""
            SELECT *
            FROM Appointment
            WHERE patient_id = %s AND status = 'scheduled'
            LIMIT 1
        """, (patient_id,))
        appointment = cursor.fetchone()

        if not appointment:
            return jsonify({'error': 'Appointment not found'}), 404

        # Update status to cancelled
        cursor.execute("""
            delete from Appointment 
            WHERE appointment_id = %s
        """, (appointment['appointment_id'],))
        conn.commit()



        return jsonify({
            'message': 'Appointment cancelled'

        }),200

    finally:
        cursor.close()
        conn.close()


@app.route('/api/scheduler/reschedule/<patient_id>', methods=['POST'])
def reschedule_appointment(patient_id):
    """Reschedule an appointment to a new time slot in the database"""
    data = request.get_json() or {}
    new_datetime_str = data.get('new_datetime')  # Expect ISO string with date + time

    if not new_datetime_str:
        return jsonify({'error': 'new_datetime is required (ISO format)'}), 400

    try:
        new_dt = datetime.fromisoformat(new_datetime_str)
        new_date = new_dt.date()
        new_time = new_dt.time()
    except ValueError:
        return jsonify({'error': 'Invalid datetime format. Use ISO format'}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        # Fetch current appointment
        cursor.execute("""
              SELECT *
              FROM Appointment
              WHERE patient_id = %s AND status = 'scheduled'
          """, (patient_id,))
        appointment = cursor.fetchone()

        if not appointment:
            return jsonify({'error': 'Appointment not found'}), 404

        # Check if new slot is taken for the same doctor
        cursor.execute("""
              SELECT COUNT(*) AS cnt
              FROM Appointment
              WHERE doctor_id = %s
                AND scheduled_date = %s
                AND scheduled_time = %s
                AND patient_id != %s
                AND status = 'scheduled'
          """, (
            appointment['doctor_id'],
            new_date,
            new_time,
            patient_id
        ))
        slot_taken = cursor.fetchone()['cnt'] > 0

        if slot_taken:
            return jsonify({'error': 'Time slot is already taken'}), 409

        # Update appointment in DB
        cursor.execute("""
              UPDATE Appointment
              SET scheduled_date = %s,
                  scheduled_time = %s,
                  updated_at = NOW()
              WHERE appointment_id = %s
          """, (
            new_date,
            new_time,
            appointment['appointment_id']
        ))
        conn.commit()

        # Return updated appointment
        appointment['scheduled_date'] = new_date.isoformat()
        appointment['scheduled_time'] = new_time.strftime("%H:%M:%S")

        return jsonify({
            'message': 'Appointment rescheduled',
            'appointment': appointment
        }),200

    finally:
        cursor.close()
        conn.close()


class SchedulerService(doctor_pb2_grpc.SchedulerServiceServicer):
    def get_connection_db(self):
        return mysql.connector.connect(
            host=os.getenv("DB_HOST", "scheduler-db"),
            port=int(os.getenv("DB_PORT", 3306)),
            user=os.getenv("DB_USER", "user"),
            password=os.getenv("DB_PASSWORD", "pass123"),
            database=os.getenv("DB_NAME", "Project")
        )

    def GetDoctors(self, request, context):
        db = self.get_connection_db()
        cursor =db.cursor(dictionary=True)
        cursor.execute("SELECT * FROM Doctor")
        rows = cursor.fetchall()
        doctors = [doctor_pb2.Doctor(doctor_id=r['doctor_id'], name=r['name'], specialization=r['specialization']) for r in rows]
        cursor.close()
        db.close()
        return doctor_pb2.DoctorList(doctors=doctors)

    def GetAvailability(self, request, context):
        db = self.get_connection_db()
        cursor = db.cursor(dictionary=True)
        cursor.execute("SELECT * FROM DoctorAvailability WHERE doctor_id=%s", (request.doctor_id,))
        rows = cursor.fetchall()
        availability_list = [doctor_pb2.DoctorAvailability(
            availability_id=r['availability_id'],
            doctor_id=r['doctor_id'],
            date=str(r['date']),
            start_time=str(r['start_time']),
            end_time=str(r['end_time']),
            available=r['available']
        ) for r in rows]
        cursor.close()
        db.close()
        return doctor_pb2.DoctorAvailabilityList(availability=availability_list)

    def UpdateAvailability(self, request, context):
        db = self.get_connection_db()
        cursor = db.cursor(dictionary=True)
        cursor.execute("UPDATE DoctorAvailability SET available=%s WHERE availability_id=%s", (request.available, request.availability_id))
        db.commit()
        cursor.close()
        db.close()
        return doctor_pb2.UpdateAvailabilityResponse(success=True)

    def CreateAvailability(self,request,context):
        try:
            db = self.get_connection_db()
            cursor = db.cursor(dictionary=True)
            cursor.execute(
                "INSERT INTO DoctorAvailability (doctor_id, date, start_time, end_time, available) VALUES (%s, %s, %s, %s, %s)",
                (request.doctor_id, request.date, request.start_time, request.end_time, request.available)
            )
            db.commit()
            availability_id = cursor.lastrowid
            cursor.close()
            db.close()
            return doctor_pb2.CreateAvailabilityResponse(
                success=True,
                availability_id=availability_id,
                message="Availability slot created successfully"
            )
        except mysql.connector.IntegrityError as e:
            # Handle duplicate entry (UNIQUE constraint violation)
            if "Duplicate entry" in str(e):
                return doctor_pb2.CreateAvailabilityResponse(
                    success=False,
                    availability_id=0,
                    message="This time slot already exists for this doctor"
                )
            else:
                return doctor_pb2.CreateAvailabilityResponse(
                    success=False,
                    availability_id=0,
                    message=f"Database integrity error: {str(e)}"
                )
        except Exception as e:
            return doctor_pb2.CreateAvailabilityResponse(
                success=False,
                availability_id=0,
                message=f"Error creating availability: {str(e)}"
            )

# Server setup
def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    doctor_pb2_grpc.add_SchedulerServiceServicer_to_server(SchedulerService(), server)
    server.add_insecure_port("[::]:50055")
    server.start()
    server.wait_for_termination()

if __name__ == '__main__':
    # Start Kafka consumer in background thread
    # consumer_thread = threading.Thread(target=consume_risk_classifications, daemon=True)
    # consumer_thread.start()
    start_http_server(8004)

    # Start gRPC server in background thread
    grpc_thread = threading.Thread(target=serve)
    grpc_thread.start()

    # Start Flask app
    app.run(host="0.0.0.0", port=5005, debug=True, use_reloader=False)

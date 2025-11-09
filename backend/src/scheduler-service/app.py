from flask import Flask, jsonify, request
from flask_cors import CORS
from kafka import KafkaConsumer, KafkaProducer
import json
import logging
from datetime import datetime, timedelta
from threading import Thread
from dataclasses import dataclass, asdict
from typing import List, Dict, Optional
import heapq

# Configuration
KAFKA_BOOTSTRAP = 'kafka:9092'
RISK_CLASSIFICATION_TOPIC = 'ai.risk.classifications'
SCHEDULING_TOPIC = 'appointment.scheduled'

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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

# Kafka producer
producer = KafkaProducer(
    bootstrap_servers=[KAFKA_BOOTSTRAP],
    value_serializer=lambda v: json.dumps(v).encode('utf-8')
)

def is_weekend(date: datetime) -> bool:
    """Check if date is Saturday (5) or Sunday (6)"""
    return date.weekday() >= 5

def get_next_available_slot() -> Optional[datetime]:
    """
    Find the next available time slot
    Returns: datetime object for the slot, or None if no slots available
    """
    # Start from current time, rounded to next hour
    current = datetime.now()
    if current.minute > 0 or current.second > 0:
        current = current.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
    else:
        current = current.replace(minute=0, second=0, microsecond=0)
    
    # If past 5 PM, start from 9 AM tomorrow
    if current.hour >= 17:
        current = (current + timedelta(days=1)).replace(hour=9, minute=0, second=0, microsecond=0)
    elif current.hour < 9:
        current = current.replace(hour=9, minute=0, second=0, microsecond=0)
    
    # Look up to 30 days ahead
    max_days = 30
    days_checked = 0
    
    while days_checked < max_days:
        # Skip weekends
        if is_weekend(current):
            current = (current + timedelta(days=1)).replace(hour=9, minute=0, second=0, microsecond=0)
            days_checked += 1
            continue
        
        # Check slots from 9 AM to 5 PM (8 slots)
        for hour in range(9, 17):
            slot_time = current.replace(hour=hour, minute=0, second=0, microsecond=0)
            
            # Skip if in the past
            if slot_time < datetime.now():
                continue
            
            # Check if slot is already taken
            is_taken = False
            for appt in scheduled_appointments:
                appt_time = datetime.fromisoformat(appt['scheduled_time'])
                # Consider slots within 30 minutes as conflicting
                if abs((appt_time - slot_time).total_seconds()) < 1800:
                    is_taken = True
                    break
            
            if not is_taken:
                return slot_time
        
        # Move to next day
        current = (current + timedelta(days=1)).replace(hour=9, minute=0, second=0, microsecond=0)
        days_checked += 1
    
    logger.warning("No available slots in the next 30 days")
    return None

def schedule_appointment(patient: Patient) -> Optional[Dict]:
    """
    Schedule an appointment for a patient in the next available slot
    """
    slot_time = get_next_available_slot()
    
    if slot_time is None:
        logger.warning(f"Could not find available slot for patient {patient.patient_id}")
        return None
    
    appointment = {
        'patient_id': patient.patient_id,
        'priority_group': patient.priority_group,
        'priority_score': patient.priority_score,
        'stability': patient.stability,
        'risk_data': patient.risk_data,
        'scheduled_time': slot_time.isoformat(),
        'status': 'scheduled',
        'created_at': datetime.now().isoformat()
    }
    
    scheduled_appointments.append(appointment)
    
    # Publish to Kafka
    try:
        producer.send(SCHEDULING_TOPIC, appointment)
        producer.flush()
        logger.info(f"✅ Appointment scheduled for patient {patient.patient_id} at {slot_time.strftime('%Y-%m-%d %H:%M')}")
    except Exception as e:
        logger.error(f"Error publishing appointment: {e}")
    
    return appointment

def determine_priority(risk_data: dict) -> tuple:
    """
    Determine priority group (P1-P4) based on risk scores
    Returns: (priority_group, priority_score, stability)
    """
    probs = risk_data.get('probs', {})
    
    # Calculate average risk across all diseases
    if probs:
        avg_risk = sum(probs.values()) / len(probs)
    else:
        avg_risk = 0.0
    
    # Determine priority group based on risk level
    if avg_risk >= 0.8:
        priority_group = 'P1' 
        stability = 'critical'
    elif avg_risk >= 0.6:
        priority_group = 'P2' 
        stability = 'unstable'
    elif avg_risk >= 0.4:
        priority_group = 'P3' 
        stability = 'moderately_stable'
    else:
        priority_group = 'P4' 
        stability = 'stable'
    
    return priority_group, avg_risk, stability

def consume_risk_classifications():
    """
    Kafka consumer thread that receives risk classifications
    and automatically schedules appointments
    """
    consumer = KafkaConsumer(
        RISK_CLASSIFICATION_TOPIC,
        bootstrap_servers=[KAFKA_BOOTSTRAP],
        value_deserializer=lambda m: json.loads(m.decode('utf-8')),
        group_id='scheduler-consumer-group',
        auto_offset_reset='latest'
    )
    
    logger.info(f"Scheduler consumer started, listening to topic: {RISK_CLASSIFICATION_TOPIC}")
    
    for message in consumer:
        try:
            risk_data = message.value
            logger.info(f"Received risk classification: {risk_data.get('patient_id', 'unknown')}")
            
            # Extract patient information
            patient_id = risk_data.get('patient_id', 'unknown')
            
            # Determine priority
            priority_group, priority_score, stability = determine_priority(risk_data)
            
            # Create patient object
            patient = Patient(
                patient_id=patient_id,
                priority_group=priority_group,
                priority_score=priority_score,
                risk_data=risk_data,
                stability=stability,
                timestamp=datetime.now().isoformat()
            )
            
            # Add to queue
            heapq.heappush(patient_queue, patient)
            logger.info(f"Patient {patient_id} added to queue with priority {priority_group}")
            
            # AUTO-SCHEDULE ALL PATIENTS (not just P1/P2)
            appointment = schedule_appointment(patient)
            if appointment:
                # Remove from queue since it's been scheduled
                try:
                    patient_queue.remove(patient)
                    heapq.heapify(patient_queue)
                except ValueError:
                    pass  # Patient already removed
            
        except Exception as e:
            logger.error(f"Error processing message: {e}")

# REST API Endpoints

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'service': 'scheduler-service',
        'status': 'healthy',
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/scheduler/stats', methods=['GET'])
def get_stats():
    """Get scheduler statistics"""
    active_appointments = [a for a in scheduled_appointments if a['status'] == 'scheduled']
    
    priority_dist = {}
    for patient in patient_queue:
        priority_dist[patient.priority_group] = priority_dist.get(patient.priority_group, 0) + 1
    
    return jsonify({
        'queue_size': len(patient_queue),
        'scheduled_appointments': len(scheduled_appointments),
        'active_appointments': len(active_appointments),
        'priority_distribution': priority_dist
    })

@app.route('/api/scheduler/queue', methods=['GET'])
def get_queue():
    """Get current patient queue"""
    queue_list = sorted(patient_queue)
    return jsonify({
        'patients': [asdict(p) for p in queue_list],
        'queue_size': len(patient_queue)
    })

@app.route('/api/scheduler/appointments', methods=['GET'])
def get_appointments():
    """Get all scheduled appointments"""
    # Sort by scheduled time
    sorted_appointments = sorted(
        scheduled_appointments,
        key=lambda x: x['scheduled_time']
    )
    return jsonify({
        'appointments': sorted_appointments,
        'count': len(sorted_appointments)
    })

@app.route('/api/scheduler/appointments/date/<date>', methods=['GET'])
def get_appointments_by_date(date):
    """Get appointments for a specific date (YYYY-MM-DD)"""
    try:
        target_date = datetime.fromisoformat(date).date()
        date_appointments = [
            appt for appt in scheduled_appointments
            if datetime.fromisoformat(appt['scheduled_time']).date() == target_date
        ]
        return jsonify({
            'date': date,
            'appointments': date_appointments,
            'count': len(date_appointments)
        })
    except ValueError:
        return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400

@app.route('/api/scheduler/schedule-next', methods=['POST'])
def schedule_next():
    """Manually schedule the next patient in queue"""
    if not patient_queue:
        return jsonify({'error': 'Queue is empty'}), 400
    
    # Get highest priority patient
    patient = heapq.heappop(patient_queue)
    
    # Schedule appointment
    appointment = schedule_appointment(patient)
    
    if appointment:
        return jsonify({
            'message': 'Patient scheduled successfully',
            'appointment': appointment
        })
    else:
        # Put patient back in queue if scheduling failed
        heapq.heappush(patient_queue, patient)
        return jsonify({'error': 'No available slots'}), 500

@app.route('/api/scheduler/schedule-batch', methods=['POST'])
def schedule_batch():
    """Schedule multiple patients at once"""
    data = request.get_json() or {}
    batch_size = data.get('batch_size', 5)
    
    scheduled_count = 0
    failed_count = 0
    
    for _ in range(min(batch_size, len(patient_queue))):
        if not patient_queue:
            break
        
        patient = heapq.heappop(patient_queue)
        appointment = schedule_appointment(patient)
        
        if appointment:
            scheduled_count += 1
        else:
            heapq.heappush(patient_queue, patient)
            failed_count += 1
    
    return jsonify({
        'scheduled_count': scheduled_count,
        'failed_count': failed_count,
        'remaining_in_queue': len(patient_queue)
    })

@app.route('/api/scheduler/cancel/<patient_id>', methods=['POST'])
def cancel_appointment(patient_id):
    """Cancel an appointment"""
    global scheduled_appointments
    
    appointment = next((a for a in scheduled_appointments if a['patient_id'] == patient_id), None)
    
    if not appointment:
        return jsonify({'error': 'Appointment not found'}), 404
    
    appointment['status'] = 'cancelled'
    logger.info(f"Appointment cancelled for patient {patient_id}")
    
    return jsonify({
        'message': 'Appointment cancelled',
        'appointment': appointment
    })

@app.route('/api/scheduler/reschedule/<patient_id>', methods=['POST'])
def reschedule_appointment(patient_id):
    """Reschedule an appointment to a new time slot"""
    data = request.get_json() or {}
    new_time_str = data.get('new_time')
    
    if not new_time_str:
        return jsonify({'error': 'new_time is required (ISO format)'}), 400
    
    try:
        new_time = datetime.fromisoformat(new_time_str)
    except ValueError:
        return jsonify({'error': 'Invalid time format. Use ISO format'}), 400
    
    # Find appointment
    appointment = next((a for a in scheduled_appointments if a['patient_id'] == patient_id), None)
    
    if not appointment:
        return jsonify({'error': 'Appointment not found'}), 404
    
    # Check if new slot is available
    is_taken = any(
        abs((datetime.fromisoformat(a['scheduled_time']) - new_time).total_seconds()) < 1800
        for a in scheduled_appointments
        if a['patient_id'] != patient_id
    )
    
    if is_taken:
        return jsonify({'error': 'Time slot is already taken'}), 409
    
    # Update appointment
    appointment['scheduled_time'] = new_time.isoformat()
    logger.info(f"Appointment rescheduled for patient {patient_id} to {new_time}")
    
    return jsonify({
        'message': 'Appointment rescheduled',
        'appointment': appointment
    })

if __name__ == '__main__':
    # Start Kafka consumer in background thread
    consumer_thread = Thread(target=consume_risk_classifications, daemon=True)
    consumer_thread.start()
    
    # Start Flask app
    app.run(host='0.0.0.0', port=5005, debug=False)
import mysql.connector
import list_patient_pb2
import list_patient_pb2_grpc
from Utils.db import get_db_connection
from prometheus_client import Counter, Histogram, Gauge
import time

# Prometheus metrics
patient_list_requests = Counter(
    'patient_list_requests_total',
    'Total patient list requests',
    ['method', 'status']  # method: list_patients/list_all, status: success/error
)

patient_query_duration = Histogram(
    'patient_query_duration_seconds',
    'Time spent executing patient queries',
    ['method'],  # method: list_patients/list_all
    buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0]
)

patients_returned = Histogram(
    'patients_returned_count',
    'Number of patients returned per request',
    ['method'],
    buckets=[1, 5, 10, 25, 50, 100, 250, 500, 1000, 5000]
)

db_query_errors = Counter(
    'patient_db_query_errors_total',
    'Total database query errors',
    ['method', 'error_type']
)

active_db_connections = Gauge(
    'patient_service_active_db_connections',
    'Number of active database connections'
)

patient_filters_used = Counter(
    'patient_filters_used_total',
    'Count of filter usage in patient queries',
    ['filter_type']  # filter_type: name, sort, pagination
)


class PatientServiceServicer(list_patient_pb2_grpc.PatientServiceServicer):

    def ListPatients(self, request, context):
        start_time = time.time()
        method = 'list_patients'

        try:
            db = get_db_connection()
            cursor = db.cursor()

            query = """
                SELECT PatientID, Name, Age, Gender, Diabetes, HMOD, CKD, CVD, CHD, RiskCategoryID
                FROM Patient
                WHERE 1=1
            """
            params = []

            # Track filter usage
            if request.name:
                query += " AND Name LIKE %s"
                params.append(f"%{request.name}%")
                patient_filters_used.labels(filter_type='name').inc()

            sort_by = request.sort_by if request.sort_by else "PatientID"
            sort_order = "ASC" if request.sort_order.lower() not in ["desc", "descending"] else "DESC"
            query += f" ORDER BY {sort_by} {sort_order}"
            patient_filters_used.labels(filter_type='sort').inc()

            page = request.page_number if request.page_number > 0 else 1
            size = request.page_size if request.page_size > 0 else 10
            offset = (page - 1) * size
            query += f" LIMIT {size} OFFSET {offset}"
            patient_filters_used.labels(filter_type='pagination').inc()

            cursor.execute(query, params)
            rows = cursor.fetchall()

            patients = []
            for r in rows:
                patients.append(
                    list_patient_pb2.Patient(
                        patient_id=r[0],
                        name=r[1],
                        age=r[2] if r[2] else 0,
                        gender=r[3] if r[3] else 0,
                        diabetes=float(r[4]) if r[4] is not None else 0.0,
                        hmod=float(r[5]) if r[5] is not None else 0.0,
                        ckd=float(r[6]) if r[6] is not None else 0.0,
                        cvd=float(r[7]) if r[7] is not None else 0.0,
                        chd=float(r[8]) if r[8] is not None else 0.0,
                        risk_category_id=r[9] if r[9] else ""
                    )
                )

            cursor.execute("SELECT COUNT(*) FROM Patient")
            total_count = cursor.fetchone()[0]
            cursor.close()
            db.close()

            # Record metrics
            duration = time.time() - start_time
            patient_query_duration.labels(method=method).observe(duration)
            patients_returned.labels(method=method).observe(len(patients))
            patient_list_requests.labels(method=method, status='success').inc()

            return list_patient_pb2.ListPatientsResponse(patients=patients, total_count=total_count)

        except mysql.connector.Error as e:
            duration = time.time() - start_time
            patient_query_duration.labels(method=method).observe(duration)
            db_query_errors.labels(method=method, error_type='mysql_error').inc()
            patient_list_requests.labels(method=method, status='error').inc()
            context.set_details(f"Database error: {str(e)}")
            context.set_code(grpc.StatusCode.INTERNAL)
            raise
        except Exception as e:
            duration = time.time() - start_time
            patient_query_duration.labels(method=method).observe(duration)
            db_query_errors.labels(method=method, error_type='unknown_error').inc()
            patient_list_requests.labels(method=method, status='error').inc()
            context.set_details(f"Internal error: {str(e)}")
            context.set_code(grpc.StatusCode.INTERNAL)
            raise

    def ListAllPatients(self, request, context):
        start_time = time.time()
        method = 'list_all_patients'

        try:
            db = get_db_connection()
            cursor = db.cursor()

            query = """
                       SELECT * FROM Patient
                   """
            cursor.execute(query)
            rows = cursor.fetchall()

            patients = []
            for r in rows:
                patients.append(
                    list_patient_pb2.Patient(
                        patient_id=r[0],
                        name=r[1],
                        age=r[2] if r[2] else 0,
                        gender=r[3] if r[3] else 0,
                        diabetes=float(r[4]) if r[4] is not None else 0.0,
                        hmod=float(r[5]) if r[5] is not None else 0.0,
                        ckd=float(r[6]) if r[6] is not None else 0.0,
                        cvd=float(r[7]) if r[7] is not None else 0.0,
                        chd=float(r[8]) if r[8] is not None else 0.0,
                        risk_category_id=r[9] if r[9] else ""
                    )
                )

            cursor.execute("SELECT COUNT(*) FROM Patient")
            total_count = cursor.fetchone()[0]
            cursor.close()
            db.close()

            # Record metrics
            duration = time.time() - start_time
            patient_query_duration.labels(method=method).observe(duration)
            patients_returned.labels(method=method).observe(len(patients))
            patient_list_requests.labels(method=method, status='success').inc()

            return list_patient_pb2.ListPatientsResponse(patients=patients, total_count=total_count)

        except mysql.connector.Error as e:
            duration = time.time() - start_time
            patient_query_duration.labels(method=method).observe(duration)
            db_query_errors.labels(method=method, error_type='mysql_error').inc()
            patient_list_requests.labels(method=method, status='error').inc()
            context.set_details(f"Database error: {str(e)}")
            context.set_code(grpc.StatusCode.INTERNAL)
            raise
        except Exception as e:
            duration = time.time() - start_time
            patient_query_duration.labels(method=method).observe(duration)
            db_query_errors.labels(method=method, error_type='unknown_error').inc()
            patient_list_requests.labels(method=method, status='error').inc()
            context.set_details(f"Internal error: {str(e)}")
            context.set_code(grpc.StatusCode.INTERNAL)
            raise
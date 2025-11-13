from datetime import date

import grpc
from concurrent import futures
import patient_detail_pb2
import patient_detail_pb2_grpc
from Utils.db import get_db_connection
from prometheus_client import start_http_server, Counter, Histogram, Gauge
import time

# Prometheus metrics
patient_detail_requests = Counter(
    'patient_detail_requests_total',
    'Total patient detail requests',
    ['method', 'status']  # method: get/update/create/insert, status: success/not_found/error
)

patient_detail_query_duration = Histogram(
    'patient_detail_query_duration_seconds',
    'Time spent executing patient detail queries',
    ['method'],
    buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0]
)

medical_records_operations = Counter(
    'medical_records_operations_total',
    'Medical records database operations',
    ['operation', 'record_type']  # operation: insert/update/delete, record_type: general/diabetes/hmod/ckd/cvd
)

medical_records_batch_size = Histogram(
    'medical_records_batch_size',
    'Number of records in batch operations',
    ['record_type'],
    buckets=[1, 2, 5, 10, 20, 50, 100]
)

patient_detail_db_errors = Counter(
    'patient_detail_db_errors_total',
    'Database errors in patient detail service',
    ['method', 'error_type']
)

patient_not_found_errors = Counter(
    'patient_not_found_total',
    'Count of patient not found errors',
    ['method']
)

patient_detail_db_connections = Gauge(
    'patient_detail_active_db_connections',
    'Active database connections in patient detail service'
)

transaction_rollbacks = Counter(
    'patient_detail_transaction_rollbacks_total',
    'Number of database transaction rollbacks',
    ['method']
)


class PatientDetailService(patient_detail_pb2_grpc.PatientDetailServiceServicer):


    def GetPatientDetails(self, request, context):
        start_time = time.time()
        method = 'get_patient_details'

        try:
            pid = request.patient_id
            db = get_db_connection()
            cursor = db.cursor(dictionary=True)
            # --- Patient ---
            cursor.execute("""
                SELECT p.*, r.Description AS risk_description
                FROM Patient p
                JOIN Risk r ON p.RiskCategoryID = r.RiskCategoryID
                WHERE p.PatientID = %s
            """, (pid,))
            patient_row = cursor.fetchone()

            if not patient_row:
                patient_not_found_errors.labels(method=method).inc()
                patient_detail_requests.labels(method=method, status=pid + ' not_found').inc()
                patient_detail_query_duration.labels(method=method).observe(time.time() - start_time)
                context.set_code(grpc.StatusCode.NOT_FOUND)
                context.set_details("Patient not found")
                return patient_detail_pb2.GetPatientDetailsResponse()

            patient = patient_detail_pb2.Patient(
                patient_id=patient_row["PatientID"],
                name=patient_row["Name"],
                age=patient_row["Age"],
                gender=patient_row["Gender"],
                diabetes=patient_row["Diabetes"],
                hmod=patient_row["HMOD"],
                ckd=patient_row["CKD"],
                cvd=patient_row["CVD"],
                chd=patient_row["CHD"],
                risk_category_id=patient_row["RiskCategoryID"],
                risk_description=patient_row["risk_description"]
            )

            # --- Tables ---
            general_info = self.query_general_info(pid)
            diabetes_info = self.query_diabetes_info(pid)
            hmod_info = self.query_hmod_info(pid)
            ckd_info = self.query_ckd_info(pid)
            cvd_info = self.query_cvd_info(pid)

            patient_detail_requests.labels(method=method, status='success').inc()
            patient_detail_query_duration.labels(method=method).observe(time.time() - start_time)

            return patient_detail_pb2.GetPatientDetailsResponse(
                patient=patient,
                general_info=general_info,
                diabetes_info=diabetes_info,
                hmod_info=hmod_info,
                ckd_info=ckd_info,
                cvd_info=cvd_info
            )

        except Exception as e:
            patient_detail_db_errors.labels(method=method, error_type=type(e).__name__).inc()
            patient_detail_requests.labels(method=method, status='error').inc()
            patient_detail_query_duration.labels(method=method).observe(time.time() - start_time)
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            raise

    def UpdatePatientDetails(self, request, context):
        start_time = time.time()
        method = 'update_patient_details'

        try:
            db = get_db_connection()
            cursor = db.cursor(dictionary=True)
            p = request.patient

            # Check if patient exists
            cursor.execute("SELECT * FROM Patient WHERE PatientID = %s", (p.patient_id,))
            existing = cursor.fetchone()

            if not existing:
                patient_not_found_errors.labels(method=method).inc()
                patient_detail_requests.labels(method=method, status='not_found').inc()
                patient_detail_query_duration.labels(method=method).observe(time.time() - start_time)
                context.set_code(grpc.StatusCode.NOT_FOUND)
                context.set_details("Patient not found")
                return patient_detail_pb2.UpdatePatientDetailsResponse(
                    success=False, message="Patient not found"
                )

            # Perform update
            cursor.execute("""
                UPDATE Patient
                SET Name = %s,
                    Age = %s,
                    Gender = %s,
                    Diabetes = %s,
                    HMOD = %s,
                    CKD = %s,
                    CVD = %s,
                    CHD = %s,
                    RiskCategoryID = %s
                WHERE PatientID = %s
            """, (
                p.name,
                p.age,
                p.gender,
                p.diabetes,
                p.hmod,
                p.ckd,
                p.cvd,
                p.chd,
                p.risk_category_id,
                p.patient_id
            ))

            medical_records_operations.labels(operation='update', record_type='patient').inc()
            db.commit()

            # Fetch updated record + risk description
            cursor.execute("""
                SELECT p.*, r.Description AS risk_description
                FROM Patient p
                JOIN Risk r ON p.RiskCategoryID = r.RiskCategoryID
                WHERE p.PatientID = %s
            """, (p.patient_id,))
            updated_row = cursor.fetchone()

            updated_patient = patient_detail_pb2.Patient(
                patient_id=updated_row["PatientID"],
                name=updated_row["Name"],
                age=updated_row["Age"],
                gender=updated_row["Gender"],
                diabetes=updated_row["Diabetes"],
                hmod=updated_row["HMOD"],
                ckd=updated_row["CKD"],
                cvd=updated_row["CVD"],
                chd=updated_row["CHD"],
                risk_category_id=updated_row["RiskCategoryID"],
                risk_description=updated_row["risk_description"]
            )

            patient_detail_requests.labels(method=method, status='success').inc()
            patient_detail_query_duration.labels(method=method).observe(time.time() - start_time)

            return patient_detail_pb2.UpdatePatientDetailsResponse(
                success=True,
                message="Patient updated successfully",
                updated_patient=updated_patient
            )

        except Exception as e:
            db.rollback()
            transaction_rollbacks.labels(method=method).inc()
            patient_detail_db_errors.labels(method=method, error_type=type(e).__name__).inc()
            patient_detail_requests.labels(method=method, status='error').inc()
            patient_detail_query_duration.labels(method=method).observe(time.time() - start_time)
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return patient_detail_pb2.UpdatePatientDetailsResponse(
                success=False,
                message="Error updating patient: " + str(e)
            )

    def UpdateMedicalRecords(self, request, context):
        """
        Updates all medical records for a patient.
        Deletes existing records and inserts new ones.
        """
        start_time = time.time()
        method = 'update_medical_records'

        try:
            db = get_db_connection()
            cursor = db.cursor()
            pid = request.patient_id

            # Check if patient exists
            cursor.execute("SELECT PatientID FROM Patient WHERE PatientID = %s", (pid,))
            if not cursor.fetchone():
                patient_not_found_errors.labels(method=method).inc()
                patient_detail_requests.labels(method=method, status='not_found').inc()
                patient_detail_query_duration.labels(method=method).observe(time.time() - start_time)
                context.set_code(grpc.StatusCode.NOT_FOUND)
                context.set_details("Patient not found")
                return patient_detail_pb2.UpdateMedicalRecordsResponse(
                    success=False,
                    message="Patient not found"
                )

            # Delete existing records
            cursor.execute("DELETE FROM GeneralInformation WHERE PID = %s", (pid,))
            medical_records_operations.labels(operation='delete', record_type='general').inc()

            cursor.execute("DELETE FROM DiabetesInformation WHERE PID = %s", (pid,))
            medical_records_operations.labels(operation='delete', record_type='diabetes').inc()

            cursor.execute("DELETE FROM HMODInformation WHERE PID = %s", (pid,))
            medical_records_operations.labels(operation='delete', record_type='hmod').inc()

            cursor.execute("DELETE FROM CKDInformation WHERE PID = %s", (pid,))
            medical_records_operations.labels(operation='delete', record_type='ckd').inc()

            cursor.execute("DELETE FROM CVDInformation WHERE PID = %s", (pid,))
            medical_records_operations.labels(operation='delete', record_type='cvd').inc()

            # Insert General Information
            for info in request.general_info:
                cursor.execute("""
                    INSERT INTO GeneralInformation 
                    (PID, AvgDailySteps, HDL, LDL, Cholesterol, CACS, RestingPulse, TestDate)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    pid,
                    info.avg_daily_steps,
                    info.hdl,
                    info.ldl,
                    info.cholesterol,
                    info.cacs,
                    info.resting_pulse,
                    info.test_date
                ))
            medical_records_operations.labels(operation='insert', record_type='general').inc()
            medical_records_batch_size.labels(record_type='general').observe(len(request.general_info))

            # Insert Diabetes Information
            for info in request.diabetes_info:
                cursor.execute("""
                    INSERT INTO DiabetesInformation 
                    (PID, FBG, HbA1c, TestDate)
                    VALUES (%s, %s, %s, %s)
                """, (
                    pid,
                    info.fbg,
                    info.hba1c,
                    info.test_date
                ))
            medical_records_operations.labels(operation='insert', record_type='diabetes').inc()
            medical_records_batch_size.labels(record_type='diabetes').observe(len(request.diabetes_info))

            # Insert HMOD Information
            for info in request.hmod_info:
                cursor.execute("""
                    INSERT INTO HMODInformation 
                    (PID, LVMass, Microalbuminuria, PWV, ABI, TestDate)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (
                    pid,
                    info.lv_mass,
                    info.microalbuminuria,
                    info.pwv,
                    info.abi,
                    info.test_date
                ))
            medical_records_operations.labels(operation='insert', record_type='hmod').inc()
            medical_records_batch_size.labels(record_type='hmod').observe(len(request.hmod_info))

            # Insert CKD Information
            for info in request.ckd_info:
                cursor.execute("""
                    INSERT INTO CKDInformation 
                    (PID, SerumCreatinine, eGFR, UACR, TestDate)
                    VALUES (%s, %s, %s, %s, %s)
                """, (
                    pid,
                    info.serum_creatinine,
                    info.egfr,
                    info.uacr,
                    info.test_date
                ))
            medical_records_operations.labels(operation='insert', record_type='ckd').inc()
            medical_records_batch_size.labels(record_type='ckd').observe(len(request.ckd_info))

            # Insert CVD Information
            for info in request.cvd_info:
                cursor.execute("""
                    INSERT INTO CVDInformation 
                    (PID, BP, Smoking, TestDate)
                    VALUES (%s, %s, %s, %s)
                """, (
                    pid,
                    info.bp,
                    info.smoking,
                    info.test_date
                ))
            medical_records_operations.labels(operation='insert', record_type='cvd').inc()
            medical_records_batch_size.labels(record_type='cvd').observe(len(request.cvd_info))

            db.commit()
            patient_detail_requests.labels(method=method, status='success').inc()
            patient_detail_query_duration.labels(method=method).observe(time.time() - start_time)

            return patient_detail_pb2.UpdateMedicalRecordsResponse(
                success=True,
                message="Medical records updated successfully"
            )

        except Exception as e:
            db.rollback()
            transaction_rollbacks.labels(method=method).inc()
            patient_detail_db_errors.labels(method=method, error_type=type(e).__name__).inc()
            patient_detail_requests.labels(method=method, status='error').inc()
            patient_detail_query_duration.labels(method=method).observe(time.time() - start_time)
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return patient_detail_pb2.UpdateMedicalRecordsResponse(
                success=False,
                message="Error updating medical records: " + str(e)
            )

    def CreatePatient(self, request, context):
        """Create a new patient with initial medical records"""
        start_time = time.time()
        method = 'create_patient'

        try:
            db = get_db_connection()

            cursor = db.cursor(dictionary=True)
            patient = request.patient
            patient_id = patient.patient_id

            # Construct risk_data from patient fields
            # risk_data = {
            #     "probs": {
            #         "diabetes": float(patient.diabetes) if patient.diabetes else 0.0,
            #         "hmod": float(patient.hmod) if patient.hmod else 0.0,
            #         "ckd": float(patient.ckd) if patient.ckd else 0.0,
            #         "cvd": float(patient.cvd) if patient.cvd else 0.0,
            #         "chd": float(patient.chd) if patient.chd else 0.0,
            #     }
            # }
           # priority_group, priority_score, stability = self.determine_priority(risk_data)

            # Insert into Patient table
            cursor.execute("""
                INSERT INTO Patient 
                (PatientID, Name, Age, Gender, Diabetes, HMOD, CKD, CVD, CHD, RiskCategoryID)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                patient_id,
                patient.name,
                patient.age,
                patient.gender,
                patient.diabetes if patient.diabetes else 0.0,
                patient.hmod if patient.hmod else 0.0,
                patient.ckd if patient.ckd else 0.0,
                patient.cvd if patient.cvd else 0.0,
                patient.chd if patient.chd else 0.0,
                patient.risk_category_id if patient.risk_category_id else None
            ))
            medical_records_operations.labels(operation='insert', record_type='patient').inc()

            # Insert all medical records
            gi = request.general_info
            cursor.execute("""
                INSERT INTO GeneralInformation 
                (PID, AvgDailySteps, HDL, LDL, Cholesterol, CACS, RestingPulse, TestDate)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                patient_id,
                gi.avg_daily_steps,
                gi.hdl,
                gi.ldl,
                gi.cholesterol,
                gi.cacs,
                gi.resting_pulse,
                gi.test_date if gi.test_date else date.today()
            ))
            medical_records_operations.labels(operation='insert', record_type='general').inc()

            di = request.diabetes_info
            cursor.execute("""
                INSERT INTO DiabetesInformation 
                (PID, FBG, HbA1c, TestDate)
                VALUES (%s, %s, %s, %s)
            """, (
                patient_id,
                di.fbg,
                di.hba1c,
                di.test_date if di.test_date else date.today()
            ))
            medical_records_operations.labels(operation='insert', record_type='diabetes').inc()

            hi = request.hmod_info
            cursor.execute("""
                INSERT INTO HMODInformation 
                (PID, LVMass, Microalbuminuria, PWV, ABI, TestDate)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (
                patient_id,
                hi.lv_mass,
                hi.microalbuminuria,
                hi.pwv,
                hi.abi,
                hi.test_date if hi.test_date else date.today()
            ))
            medical_records_operations.labels(operation='insert', record_type='hmod').inc()

            ci = request.ckd_info
            cursor.execute("""
                INSERT INTO CKDInformation 
                (PID, SerumCreatinine, eGFR, UACR, TestDate)
                VALUES (%s, %s, %s, %s, %s)
            """, (
                patient_id,
                ci.serum_creatinine,
                ci.egfr,
                ci.uacr,
                ci.test_date if ci.test_date else date.today()
            ))
            medical_records_operations.labels(operation='insert', record_type='ckd').inc()

            cv = request.cvd_info
            cursor.execute("""
                INSERT INTO CVDInformation 
                (PID, BP, Smoking, TestDate)
                VALUES (%s, %s, %s, %s)
            """, (
                patient_id,
                cv.bp,
                cv.smoking,
                cv.test_date if cv.test_date else date.today()
            ))
            medical_records_operations.labels(operation='insert', record_type='cvd').inc()

            db.commit()

            # Fetch the created patient
            cursor.execute("""
                SELECT PatientID, Name, Age, Gender, Diabetes, HMOD, CKD, CVD, CHD, 
                       p.RiskCategoryID, COALESCE(r.Description, '') as RiskDescription
                FROM Patient p
                LEFT JOIN Risk r ON p.RiskCategoryID = r.RiskCategoryID
                WHERE PatientID = %s
            """, (patient_id,))

            patient_data = cursor.fetchone()
            cursor.close()
            db.close()

            patient = patient_detail_pb2.Patient(
                patient_id=patient_data["PatientID"],
                name=patient_data["Name"],
                age=patient_data["Age"],
                gender=patient_data["Gender"],
                diabetes=patient_data["Diabetes"],
                hmod=patient_data["HMOD"],
                ckd=patient_data["CKD"],
                cvd=patient_data["CVD"],
                chd=patient_data["CHD"],
                risk_category_id=patient_data["RiskCategoryID"] or "",
                risk_description=patient_data["RiskDescription"]
            )

            patient_detail_requests.labels(method=method, status='success').inc()
            patient_detail_query_duration.labels(method=method).observe(time.time() - start_time)

            return patient_detail_pb2.CreatePatientResponse(
                success=True,
                message="Patient created successfully",
                patient_id=patient_id,
                patient=patient
            )

        except Exception as e:
            db.rollback()
            transaction_rollbacks.labels(method=method).inc()
            patient_detail_db_errors.labels(method=method, error_type=type(e).__name__).inc()
            patient_detail_requests.labels(method=method, status='error').inc()
            patient_detail_query_duration.labels(method=method).observe(time.time() - start_time)
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(f'Database error: {str(e)}')
            return patient_detail_pb2.CreatePatientResponse(
                success=False,
                message=str(e),
                patient_id=0
            )

    def InsertPatientRecords(self, request, context):
        """Insert new medical records for an existing patient (by PatientID)"""
        start_time = time.time()
        method = 'insert_patient_records'

        try:
            db = get_db_connection()

            cursor = db.cursor(dictionary=True)
            patient = request.patient

            # Check if patient exists
            cursor.execute("SELECT * FROM Patient WHERE PatientID = %s", (patient.patient_id,))
            patient_exists = cursor.fetchone()

            if not patient_exists:
                patient_not_found_errors.labels(method=method).inc()
                patient_detail_requests.labels(method=method, status='not_found').inc()
                patient_detail_query_duration.labels(method=method).observe(time.time() - start_time)
                context.set_code(grpc.StatusCode.NOT_FOUND)
                context.set_details(f"PatientID {patient.patient_id} not found.")
                return patient_detail_pb2.InsertPatientRecordsResponse(
                    success=False,
                    message="Patient not found."
                )

            #     # Construct risk_data from patient fields
            # risk_data = {
            #     "probs": {
            #         "diabetes": float(patient.diabetes) if patient.diabetes else 0.0,
            #         "hmod": float(patient.hmod) if patient.hmod else 0.0,
            #         "ckd": float(patient.ckd) if patient.ckd else 0.0,
            #         "cvd": float(patient.cvd) if patient.cvd else 0.0,
            #         "chd": float(patient.chd) if patient.chd else 0.0,
            #     }
            # }
            # priority_group, priority_score, stability = self.determine_priority(risk_data)

            # Update patient table
            cursor.execute("""
                UPDATE Patient
                SET 
                    Diabetes = %s,
                    HMOD = %s,
                    CKD = %s,
                    CVD = %s,
                    CHD = %s,
                    RiskCategoryID = %s
                WHERE PatientID = %s
            """, (
                patient.diabetes if patient.diabetes else 0.0,
                patient.hmod if patient.hmod else 0.0,
                patient.ckd if patient.ckd else 0.0,
                patient.cvd if patient.cvd else 0.0,
                patient.chd if patient.chd else 0.0,
                patient.risk_category_id if patient.risk_category_id else None,
                patient.patient_id
            ))
            medical_records_operations.labels(operation='update', record_type='patient').inc()

            # Insert all medical records
            gi = request.general_info
            cursor.execute("""
                INSERT INTO GeneralInformation 
                (PID, AvgDailySteps, HDL, LDL, Cholesterol, CACS, RestingPulse, TestDate)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                patient.patient_id,
                gi.avg_daily_steps,
                gi.hdl,
                gi.ldl,
                gi.cholesterol,
                gi.cacs,
                gi.resting_pulse,
                gi.test_date if gi.test_date else date.today()
            ))
            medical_records_operations.labels(operation='insert', record_type='general').inc()

            di = request.diabetes_info
            cursor.execute("""
                INSERT INTO DiabetesInformation 
                (PID, FBG, HbA1c, TestDate)
                VALUES (%s, %s, %s, %s)
            """, (
                patient.patient_id,
                di.fbg,
                di.hba1c,
                di.test_date if di.test_date else date.today()
            ))
            medical_records_operations.labels(operation='insert', record_type='diabetes').inc()

            hi = request.hmod_info
            cursor.execute("""
                INSERT INTO HMODInformation 
                (PID, LVMass, Microalbuminuria, PWV, ABI, TestDate)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (
                patient.patient_id,
                hi.lv_mass,
                hi.microalbuminuria,
                hi.pwv,
                hi.abi,
                hi.test_date if hi.test_date else date.today()
            ))
            medical_records_operations.labels(operation='insert', record_type='hmod').inc()

            ci = request.ckd_info
            cursor.execute("""
                INSERT INTO CKDInformation 
                (PID, SerumCreatinine, eGFR, UACR, TestDate)
                VALUES (%s, %s, %s, %s, %s)
            """, (
                patient.patient_id,
                ci.serum_creatinine,
                ci.egfr,
                ci.uacr,
                ci.test_date if ci.test_date else date.today()
            ))
            medical_records_operations.labels(operation='insert', record_type='ckd').inc()

            cv = request.cvd_info
            cursor.execute("""
                INSERT INTO CVDInformation 
                (PID, BP, Smoking, TestDate)
                VALUES (%s, %s, %s, %s)
            """, (
                patient.patient_id,
                cv.bp,
                cv.smoking,
                cv.test_date if cv.test_date else date.today()
            ))
            medical_records_operations.labels(operation='insert', record_type='cvd').inc()

            db.commit()
            patient_detail_requests.labels(method=method, status='success').inc()
            patient_detail_query_duration.labels(method=method).observe(time.time() - start_time)
            cursor.close()
            db.close()

            return patient_detail_pb2.InsertPatientRecordsResponse(
                success=True,
                message=f"New records inserted successfully for PatientID {patient.patient_id}"
            )

        except Exception as e:
            db.rollback()
            transaction_rollbacks.labels(method=method).inc()
            patient_detail_db_errors.labels(method=method, error_type=type(e).__name__).inc()
            patient_detail_requests.labels(method=method, status='error').inc()
            patient_detail_query_duration.labels(method=method).observe(time.time() - start_time)
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(f"Database error: {str(e)}")
            return patient_detail_pb2.InsertPatientRecordsResponse(
                success=False,
                message=str(e)
            )
    # -- Priority --
    def determine_priority(self,risk_data: dict) -> tuple:
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

    # --- Mapping functions for each table ---
    def query_general_info(self, pid):
        db = get_db_connection()

        cursor = db.cursor(dictionary=True)
        cursor.execute("SELECT * FROM GeneralInformation WHERE PID=%s", (pid,))
        rows = cursor.fetchall()
        return [
            patient_detail_pb2.GeneralInformation(
                info_id=r["InfoID"],
                pid=r["PID"],
                avg_daily_steps=r["AvgDailySteps"],
                hdl=r["HDL"],
                ldl=r["LDL"],
                cholesterol=r["Cholesterol"],
                cacs=r["CACS"],
                resting_pulse=r["RestingPulse"],
                test_date=str(r["TestDate"])
            ) for r in rows
        ]

    def query_diabetes_info(self, pid):
        db = get_db_connection()
        cursor = db.cursor(dictionary=True)
        cursor.execute("SELECT * FROM DiabetesInformation WHERE PID=%s", (pid,))
        rows = cursor.fetchall()
        return [
            patient_detail_pb2.DiabetesInformation(
                diabetes_id=r["DiabetesID"],
                pid=r["PID"],
                fbg=r["FBG"],
                hba1c=r["HbA1c"],
                test_date=str(r["TestDate"])
            ) for r in rows
        ]

    def query_hmod_info(self, pid):
        db = get_db_connection()
        cursor = db.cursor(dictionary=True)
        cursor.execute("SELECT * FROM HMODInformation WHERE PID=%s", (pid,))
        rows = cursor.fetchall()
        return [
            patient_detail_pb2.HMODInformation(
                hmod_id=r["HMODID"],
                pid=r["PID"],
                lv_mass=r["LVMass"],
                microalbuminuria=r["Microalbuminuria"],
                pwv=r["PWV"],
                abi=r["ABI"],
                test_date=str(r["TestDate"])
            ) for r in rows
        ]

    def query_ckd_info(self, pid):
        db = get_db_connection()
        cursor = db.cursor(dictionary=True)
        cursor.execute("SELECT * FROM CKDInformation WHERE PID=%s", (pid,))
        rows = cursor.fetchall()
        return [
            patient_detail_pb2.CKDInformation(
                ckd_id=r["CKDID"],
                pid=r["PID"],
                serum_creatinine=r["SerumCreatinine"],
                egfr=r["eGFR"],
                uacr=r["UACR"],
                test_date=str(r["TestDate"])
            ) for r in rows
        ]

    def query_cvd_info(self, pid):
        db = get_db_connection()
        cursor = db.cursor(dictionary=True)
        cursor.execute("SELECT * FROM CVDInformation WHERE PID=%s", (pid,))
        rows = cursor.fetchall()
        return [
            patient_detail_pb2.CVDInformation(
                cvd_id=r["CVDID"],
                pid=r["PID"],
                bp=r["BP"],
                smoking=r["Smoking"],
                test_date=str(r["TestDate"])

            ) for r in rows
        ]

def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    patient_detail_pb2_grpc.add_PatientDetailServiceServicer_to_server(PatientDetailService(), server)
    server.add_insecure_port("[::]:50053")
    server.start()
    server.wait_for_termination()

if __name__ == "__main__":
    start_http_server(8002)
    serve()
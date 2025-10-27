import mysql.connector
import list_patient_pb2
import list_patient_pb2_grpc
from Utils.db import get_db_connection

class PatientServiceServicer(list_patient_pb2_grpc.PatientServiceServicer):
    def __init__(self):
        self.conn = get_db_connection()

    def ListPatients(self, request, context):
        cursor = self.conn.cursor()

        query = """
            SELECT PatientID, Name, Age, Gender, Diabetes, HMOD, CKD, CVD, CHD, RiskCategoryID
            FROM Patient
            WHERE 1=1
        """
        params = []

        if request.name:
            query += " AND Name LIKE %s"
            params.append(f"%{request.name}%")

        sort_by = request.sort_by if request.sort_by else "PatientID"
        sort_order = "ASC" if request.sort_order.lower() not in ["desc", "descending"] else "DESC"
        query += f" ORDER BY {sort_by} {sort_order}"

        page = request.page_number if request.page_number > 0 else 1
        size = request.page_size if request.page_size > 0 else 10
        offset = (page - 1) * size
        query += f" LIMIT {size} OFFSET {offset}"

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

        return list_patient_pb2.ListPatientsResponse(patients=patients, total_count=total_count)


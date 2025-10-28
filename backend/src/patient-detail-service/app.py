import grpc
from concurrent import futures
import patient_detail_pb2
import patient_detail_pb2_grpc
from Utils.db import get_db_connection

class PatientDetailService(patient_detail_pb2_grpc.PatientDetailServiceServicer):
    def __init__(self):
        self.db = get_db_connection()

    def GetPatientDetails(self, request, context):
        pid = request.patient_id
        cursor = self.db.cursor(dictionary=True)

        # --- Patient ---
        cursor.execute("""
            SELECT p.*, r.Description AS risk_description
            FROM Patient p
            JOIN Risk r ON p.RiskCategoryID = r.RiskCategoryID
            WHERE p.PatientID = %s
        """, (pid,))
        patient_row = cursor.fetchone()
        if not patient_row:
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

        return patient_detail_pb2.GetPatientDetailsResponse(
            patient=patient,
            general_info=general_info,
            diabetes_info=diabetes_info,
            hmod_info=hmod_info,
            ckd_info=ckd_info,
            cvd_info=cvd_info
        )

    # --- Mapping functions for each table ---
    def query_general_info(self, pid):
        cursor = self.db.cursor(dictionary=True)
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
        cursor = self.db.cursor(dictionary=True)
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
        cursor = self.db.cursor(dictionary=True)
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
        cursor = self.db.cursor(dictionary=True)
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
        cursor = self.db.cursor(dictionary=True)
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
    serve()

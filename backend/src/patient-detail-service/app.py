from flask import Flask, jsonify
from flask_cors import CORS
from Utils.db import get_db_connection

app = Flask(__name__)
CORS(app, resources={r"/patient/*": {"origins": "*"}})

@app.get("/patient/health")
def health():
    return {"status": "ok"}, 200

@app.get("/patient/details/<int:patient_id>")
def patient_details(patient_id):
    db = get_db_connection()
    if db is None:
        return jsonify({"error": "Database connection failed"}), 500

    try:
        cur = db.cursor(dictionary=True)

        # Base profile
        cur.execute("""
            SELECT p.PatientID, p.Name, p.Age, p.Gender, p.Diabetes, p.HMOD, p.CKD, p.CVD,
                   p.CHD, p.RiskCategoryID, r.Description AS RiskDescription
            FROM Patient p
            LEFT JOIN Risk r ON p.RiskCategoryID = r.RiskCategoryID
            WHERE p.PatientID = %s
        """, (patient_id,))
        patient = cur.fetchone()
        if not patient:
            cur.close(); db.close()
            return jsonify({"error": "Patient not found"}), 404

        # Latest records by section
        cur.execute("""SELECT * FROM GeneralInformation WHERE PID=%s ORDER BY TestDate DESC LIMIT 1""", (patient_id,))
        patient["general"] = cur.fetchone()

        cur.execute("""SELECT * FROM DiabetesInformation WHERE PID=%s ORDER BY TestDate DESC LIMIT 1""", (patient_id,))
        patient["diabetes"] = cur.fetchone()

        cur.execute("""SELECT * FROM HMODInformation WHERE PID=%s ORDER BY TestDate DESC LIMIT 1""", (patient_id,))
        patient["hmod"] = cur.fetchone()

        cur.execute("""SELECT * FROM CKDInformation WHERE PID=%s ORDER BY TestDate DESC LIMIT 1""", (patient_id,))
        patient["ckd"] = cur.fetchone()

        cur.execute("""SELECT * FROM CVDInformation WHERE PID=%s ORDER BY TestDate DESC LIMIT 1""", (patient_id,))
        patient["cvd"] = cur.fetchone()

        cur.close(); db.close()
        return jsonify(patient), 200

    except Exception as e:
        print("Error:", e)
        try:
            cur.close(); db.close()
        except: pass
        return jsonify({"error": "Query failed"}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5003, debug=True)

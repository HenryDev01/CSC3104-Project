from flask import Flask, jsonify, request
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
    

@app.route('/patient/create', methods=['POST'])
def create_patient():
    """Create a new patient with health information"""
    try:
        data = request.json
        
        # Validate required fields
        if not data.get('name') or not data.get('age'):
            return jsonify({
                "success": False,
                "error": "Name and age are required"
            }), 400
        
        db = get_db_connection()
        if not db:
            return jsonify({
                "success": False,
                "error": "Database connection failed"
            }), 500
        
        cur = db.cursor()
        
        # Insert patient basic info
        cur.execute("""
            INSERT INTO Patient 
            (Name, Age, Gender, Diabetes, HMOD, CKD, CVD, CHD, RiskCategoryID)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            data['name'],
            int(data['age']),
            int(data.get('gender', 1)),
            1 if data.get('diabetes') else 0,
            1 if data.get('hmod') else 0,
            1 if data.get('ckd') else 0,
            1 if data.get('cvd') else 0,
            float(data.get('chd', 0.0)),
            'P4'  # Default to lowest risk
        ))
        
        patient_id = cur.lastrowid
        
        # Insert general information if provided
        if data.get('general_info'):
            gi = data['general_info']
            cur.execute("""
                INSERT INTO GeneralInformation 
                (PID, TestDate, Weight, Height, Steps, Cholesterol)
                VALUES (%s, CURDATE(), %s, %s, %s, %s)
            """, (
                patient_id,
                gi.get('weight'),
                gi.get('height'),
                gi.get('steps'),
                gi.get('cholesterol')
            ))
        
        db.commit()
        cur.close()
        db.close()
        
        print(f"Created patient {patient_id}: {data['name']}")
        
        return jsonify({
            "success": True,
            "patient_id": patient_id,
            "message": "Patient created successfully"
        }), 201
        
    except Exception as e:
        print(f"Error creating patient: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/patient/update/<int:patient_id>', methods=['PUT'])
def update_patient(patient_id):
    """Update existing patient information"""
    try:
        data = request.json
        
        db = get_db_connection()
        if not db:
            return jsonify({
                "success": False,
                "error": "Database connection failed"
            }), 500
        
        cur = db.cursor()
        
        # Check if patient exists
        cur.execute("SELECT PatientID FROM Patient WHERE PatientID = %s", (patient_id,))
        if not cur.fetchone():
            return jsonify({
                "success": False,
                "error": "Patient not found"
            }), 404
        
        # Update patient basic info
        cur.execute("""
            UPDATE Patient 
            SET Name = %s, Age = %s, Gender = %s, 
                Diabetes = %s, HMOD = %s, CKD = %s, CVD = %s, CHD = %s
            WHERE PatientID = %s
        """, (
            data.get('name'),
            int(data.get('age')),
            int(data.get('gender', 1)),
            1 if data.get('diabetes') else 0,
            1 if data.get('hmod') else 0,
            1 if data.get('ckd') else 0,
            1 if data.get('cvd') else 0,
            float(data.get('chd', 0.0)),
            patient_id
        ))
        
        db.commit()
        cur.close()
        db.close()
        
        print(f"Updated patient {patient_id}: {data.get('name')}")
        
        return jsonify({
            "success": True,
            "patient_id": patient_id,
            "message": "Patient updated successfully"
        }), 200
        
    except Exception as e:
        print(f"Error updating patient: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500
    
@app.route('/patient/delete/<int:patient_id>', methods=['DELETE'])
def delete_patient(patient_id):
    """Delete a patient and all related health information"""
    try:
        db = get_db_connection()
        if not db:
            return jsonify({
                "success": False,
                "error": "Database connection failed"
            }), 500
        
        cur = db.cursor(dictionary=True)
        
        # Check if patient exists
        cur.execute("SELECT Name FROM Patient WHERE PatientID = %s", (patient_id,))
        patient = cur.fetchone()
        
        if not patient:
            return jsonify({
                "success": False,
                "error": "Patient not found"
            }), 404
        
        patient_name = patient['Name']
        
        # Delete related health information (foreign key constraints)
        cur.execute("DELETE FROM GeneralInformation WHERE PID = %s", (patient_id,))
        cur.execute("DELETE FROM DiabetesInformation WHERE PID = %s", (patient_id,))
        cur.execute("DELETE FROM HMODInformation WHERE PID = %s", (patient_id,))
        cur.execute("DELETE FROM CKDInformation WHERE PID = %s", (patient_id,))
        cur.execute("DELETE FROM CVDInformation WHERE PID = %s", (patient_id,))
        
        # Delete patient
        cur.execute("DELETE FROM Patient WHERE PatientID = %s", (patient_id,))
        
        db.commit()
        cur.close()
        db.close()
        
        print(f"Deleted patient {patient_id}: {patient_name}")
        
        return jsonify({
            "success": True,
            "message": f"Patient '{patient_name}' deleted successfully"
        }), 200
        
    except Exception as e:
        print(f"Error deleting patient: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500



if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5003, debug=True)

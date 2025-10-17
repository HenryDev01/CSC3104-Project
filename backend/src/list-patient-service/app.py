from flask import Flask, jsonify, request
from flask_cors import CORS
from Utils.db import get_db_connection

app = Flask(__name__)
# Allow Envoy/Frontend to call us
CORS(app, resources={r"/list/*": {"origins": "*"}})

@app.get("/list/health")
def health():
    return {"status": "ok"}, 200

@app.get("/list/patients")
def list_patients():
    """
    Returns a JSON list of patients with minimal fields.
    Supports optional query params:
      - q (search by name, case-insensitive)
      - risk (P1|P2|P3|P4)
      - gender (0=female,1=male)
      - page (default 1)
      - page_size (default 20, max 100)
    """
    db = get_db_connection()
    if db is None:
        return jsonify({"error": "Database connection failed"}), 500

    q = (request.args.get("q") or "").strip()
    risk = (request.args.get("risk") or "").strip().upper()
    gender = request.args.get("gender")
    page = max(int(request.args.get("page", 1)), 1)
    page_size = min(max(int(request.args.get("page_size", 20)), 1), 100)
    offset = (page - 1) * page_size

    filters = []
    params = []

    if q:
        filters.append("LOWER(Name) LIKE %s")
        params.append(f"%{q.lower()}%")
    if risk in ("P1", "P2", "P3", "P4"):
        filters.append("RiskCategoryID = %s")
        params.append(risk)
    if gender in ("0", "1"):
        filters.append("Gender = %s")
        params.append(int(gender))

    where = f"WHERE {' AND '.join(filters)}" if filters else ""
    count_sql = f"SELECT COUNT(*) FROM Patient {where}"
    data_sql = f"""
      SELECT PatientID, Name, Age, Gender, Diabetes, HMOD, CKD, CVD, CHD, RiskCategoryID
      FROM Patient
      {where}
      ORDER BY PatientID ASC
      LIMIT %s OFFSET %s
    """

    try:
        cur = db.cursor()
        # total count
        cur.execute(count_sql, tuple(params))
        total = cur.fetchone()[0]

        # page data
        cur.execute(data_sql, tuple(params) + (page_size, offset))
        rows = cur.fetchall()
        col_names = [desc[0] for desc in cur.description]
        cur.close()
        db.close()

        patients = [dict(zip(col_names, row)) for row in rows]
        return jsonify({
            "total": total,
            "page": page,
            "page_size": page_size,
            "patients": patients
        }), 200

    except Exception as e:
        print("Error fetching patients:", e)
        try:
            cur.close()
            db.close()
        except Exception:
            pass
        return jsonify({"error": "Query failed"}), 500

if __name__ == "__main__":
    # Dev server (Compose maps 5002:5002)
    app.run(host="0.0.0.0", port=5002, debug=True)

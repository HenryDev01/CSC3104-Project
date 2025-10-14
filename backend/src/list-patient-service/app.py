from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
from Utils.db import get_db_connection

app = Flask(__name__)
CORS(app)

data = None

@app.route('/list/patient', methods=['POST'])
def login():
    global data
    data = request.json
    print(data)
    return jsonify({"status":"list ok"}),200

@app.route('/list/patient', methods=['GET'])
def getLogin():
    return jsonify(data)



if __name__ == "__main__":
    db = get_db_connection()
    cursor = db.cursor()
    cursor.execute("SHOW DATABASES")
    data = cursor.fetchall()
    print(data)
    app.run(host="0.0.0.0", port=5002,debug=True)

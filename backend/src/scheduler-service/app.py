from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

data = None

@app.route('/test/scheduler', methods=['POST'])
def login():
    global data
    data = request.json
    print(data)
    return jsonify({"status":"ok"}),200

@app.route('/test/scheduler', methods=['GET'])
def getLogin():
    return jsonify(data)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5005,debug=True)
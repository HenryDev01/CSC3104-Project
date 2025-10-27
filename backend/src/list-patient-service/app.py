from flask import Flask, request, jsonify
from flask_cors import CORS
from Model.ListPatientService import PatientServiceServicer
from concurrent import futures
import list_patient_pb2_grpc
import grpc
import threading

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



def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    list_patient_pb2_grpc.add_PatientServiceServicer_to_server(PatientServiceServicer(), server)
    server.add_insecure_port("[::]:50052")
    print("🚀 gRPC Patient Service running on port 50052")
    server.start()
    server.wait_for_termination()


if __name__ == "__main__":
    serve()

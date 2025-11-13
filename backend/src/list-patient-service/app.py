from Model.ListPatientService import PatientServiceServicer
from concurrent import futures
import list_patient_pb2_grpc
import grpc
import threading
from prometheus_client import start_http_server



data = None




def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    list_patient_pb2_grpc.add_PatientServiceServicer_to_server(PatientServiceServicer(), server)
    server.add_insecure_port("[::]:50052")
    print("🚀 gRPC Patient Service running on port 50052")
    server.start()
    server.wait_for_termination()


if __name__ == "__main__":
    start_http_server(8001)
    serve()

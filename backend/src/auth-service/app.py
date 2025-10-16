from flask import Flask, request, jsonify
from flask_cors import CORS
from model.Auth import AuthenticationService
from concurrent import futures
from Utils.db import get_db_connection
import auth_pb2_grpc
import grpc
import threading

app = Flask(__name__)
CORS(app)

# THIS FILE IS RUNNING USING JUST GRPC WITHOUT FLASK. FLASK CODE IS HERE JUST FOR EXAMPLE
# YOU CAN PICK EITHER ONE

def serve_grpc():
    port = "50051"
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    auth_pb2_grpc.add_AuthenticationServicer_to_server(AuthenticationService(), server)
    server.add_insecure_port("[::]:" + port)
    server.start()
    print("gRPC server started on port", port)
    server.wait_for_termination()

if __name__ == "__main__":
    grpc_thread = threading.Thread(target=serve_grpc)
    grpc_thread.start()

    # Keep main thread alive
    grpc_thread.join()

# if we are using grpc, flask is not really needed tbh
# or if you want, you can route the traffic to flask http route then call grpc. modify the envoy.yaml port to GRPC server port
# def serve_grpc():
#     port = "50051"
#     server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
#     auth_pb2_grpc.add_AuthenticationServicer_to_server(AuthenticationService(), server)
#     server.add_insecure_port("[::]:" + port)
#     server.start()
#     print("Server started, listening on " + port)
#     server.wait_for_termination()

# example of using flask as gateway for grpc. Need to modify the envoy.yaml to flask port if use this
@app.route("/api/auth/login", methods = ["POST"])
def login():
    #grpc_thread = threading.Thread(target=serve_grpc())
    #grpc_thread.start()
    pass

# if __name__ == "__main__":
#     # db example
#     db = get_db_connection()
#     cursor = db.cursor()
#     cursor.execute("SHOW DATABASES")
#     data = cursor.fetchall()
#     print(data)

#     grpc_thread = threading.Thread(target=serve_grpc())
#     grpc_thread.start()

    # can remove if you want to use grpc entirely without flask
    # app.run(host="0.0.0.0", port=5001,debug=True)


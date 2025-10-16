import auth_pb2
import auth_pb2_grpc
from Utils.db import get_db_connection
import grpc

class AuthenticationService(auth_pb2_grpc.AuthenticationServicer):
    """
    gRPC service for authentication.
    """

    def is_credential_correct(self, request, context):
        """
        Check username and password against the Users table.
        Returns CredentialResponse(x=True/False)
        """
        username = request.x
        password = request.y

        db = get_db_connection()
        if db is None:
            context.set_details("Database connection failed")
            context.set_code(grpc.StatusCode.INTERNAL)
            return auth_pb2.Reply(x=False)

        try:
            cursor = db.cursor()
            cursor.execute("SELECT password FROM Users WHERE username=%s", (username,))
            row = cursor.fetchone()
            cursor.close()
            db.close()

            if row and row[0] == password:
                return auth_pb2.Reply(x=True)
            else:
                return auth_pb2.Reply(x=False)
        except Exception as e:
            print(f"Error querying database: {e}")
            return auth_pb2.Reply(x=False)
        
# import auth_pb2
# from Utils.db import get_db_connection

# class AuthenticationService:
#     # Need to conenct to db and then check
#     def is_credential_correct(self,request,context):
#         if request.x == "Henry" and request.y == "Boey":
#             return auth_pb2.Reply(x=True)
#         return auth_pb2.Reply(x=False)

#     def generate_token(self):
#         pass

#     def validate_token(self,token):
#         pass

#     def logout(self):
#         pass
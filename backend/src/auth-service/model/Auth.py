import auth_pb2
from Utils.db import get_db_connection

class AuthenticationService:
    # Need to conenct to db and then check
    def is_credential_correct(self,request,context):
        if request.x == "Henry" and request.y == "Boey":
            return auth_pb2.Reply(x=True)
        return auth_pb2.Reply(x=False)

    def generate_token(self):
        pass

    def validate_token(self,token):
        pass

    def logout(self):
        pass
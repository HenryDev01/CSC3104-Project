import auth_pb2
import auth_pb2_grpc
from Utils.db import get_db_connection
import grpc
import jwt
import datetime
from prometheus_client import Counter, Histogram, Gauge
import time

# Prometheus metrics
incoming_requests = Counter(
    'incoming_requests_total',
    'Total incoming requests to auth service',
    ['method']  # gRPC method name
)

login_attempts = Counter(
    'login_attempts_total',
    'Total login attempts',
    ['status', 'reason']
)

token_validations = Counter(
    'token_validations_total',
    'Total token validation attempts',
    ['status']
)

login_duration = Histogram(
    'login_duration_seconds',
    'Time spent processing login requests',
    buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0]
)

token_validation_duration = Histogram(
    'token_validation_duration_seconds',
    'Time spent validating tokens',
    buckets=[0.001, 0.005, 0.01, 0.025, 0.05, 0.1]
)

active_tokens = Gauge(
    'active_tokens_total',
    'Number of currently active (non-expired) tokens issued'
)

db_connection_failures = Counter(
    'db_connection_failures_total',
    'Total database connection failures',
    ['service']
)

class AuthenticationService(auth_pb2_grpc.AuthenticationServicer):
    def is_credential_correct(self, request, context):
        incoming_requests.labels(method='is_credential_correct').inc()
        start_time = time.time()
        username = request.username
        password = request.password

        client_ip = context.peer()
        print(f"[LOGIN ATTEMPT] user={username}, ip={client_ip}")

        db = get_db_connection()
        if db is None:
            context.set_details("Database connection failed")
            context.set_code(grpc.StatusCode.INTERNAL)
            login_attempts.labels(status='failure', reason='db_connection').inc()
            db_connection_failures.labels(service='authentication').inc()
            login_duration.observe(time.time() - start_time)
            return auth_pb2.Reply(is_valid=False, token=None)

        try:
            cursor = db.cursor()
            cursor.execute("SELECT password FROM Users WHERE username=%s", (username,))
            row = cursor.fetchone()
            cursor.close()
            db.close()

            if row and row[0] == password:
                token = self.generate_token(username)
                login_attempts.labels(status='success', reason='ok').inc()
                active_tokens.inc()
                print(f"[LOGIN SUCCESS] user={username}, ip={client_ip}")
                login_duration.observe(time.time() - start_time)
                return auth_pb2.Reply(is_valid=True, token=token)
            else:
                login_attempts.labels(status='failure', reason='invalid_credentials').inc()
                print(f"[LOGIN FAILURE] user={username}, ip={client_ip}")
                login_duration.observe(time.time() - start_time)
                return auth_pb2.Reply(is_valid=False, token=None)

        except Exception as e:
            print(f"[LOGIN ERROR] user={username}, ip={client_ip}, error={e}")
            login_attempts.labels(status='failure', reason='db_query_error').inc()
            login_duration.observe(time.time() - start_time)
            return auth_pb2.Reply(is_valid=False, token=None)

    def generate_token(self, username):
        payload = {
            "username": username,
            "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=2)
        }
        token = jwt.encode(payload, "DEV", algorithm="HS256")
        return token

    def validate_token(self, request, context):
        incoming_requests.labels(method='validate_token').inc()
        start_time = time.time()
        token = request.token
        try:
            decoded = jwt.decode(token, "DEV", algorithms=["HS256"])
            username = decoded.get("username", "")
            token_validations.labels(status='valid').inc()
            token_validation_duration.observe(time.time() - start_time)
            return auth_pb2.TokenReply(valid=True, username=username)
        except jwt.ExpiredSignatureError:
            context.set_details("Token expired")
            context.set_code(grpc.StatusCode.UNAUTHENTICATED)
            token_validations.labels(status='expired').inc()
            active_tokens.dec()
            token_validation_duration.observe(time.time() - start_time)
            return auth_pb2.TokenReply(valid=False, username="")
        except jwt.InvalidTokenError:
            context.set_details("Invalid token")
            context.set_code(grpc.StatusCode.UNAUTHENTICATED)
            token_validations.labels(status='invalid').inc()
            token_validation_duration.observe(time.time() - start_time)
            return auth_pb2.TokenReply(valid=False, username="")

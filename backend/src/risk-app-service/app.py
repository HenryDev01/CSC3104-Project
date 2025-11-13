import uuid
import json
import os
from concurrent import futures
import grpc
from confluent_kafka import Producer, Consumer, KafkaError
import risk_pb2
import risk_pb2_grpc
from prometheus_client import start_http_server, Counter, Histogram, Gauge
import time

TOPIC = os.getenv("TOPIC_INFER_REQUESTS", "ai.infer.requests")
producer = Producer({"bootstrap.servers": "kafka:9092"})

# Prometheus metrics
risk_submission_requests = Counter(
    'risk_submission_requests_total',
    'Total risk submission requests',
    ['status']  # status: success/error
)

risk_retrieval_requests = Counter(
    'risk_retrieval_requests_total',
    'Total risk retrieval requests',
    ['status']  # status: success/not_found/error
)

risk_submission_duration = Histogram(
    'risk_submission_duration_seconds',
    'Time spent processing risk submissions',
    buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5]
)

risk_retrieval_duration = Histogram(
    'risk_retrieval_duration_seconds',
    'Time spent retrieving risk classifications',
    buckets=[0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0, 60.0]
)

kafka_messages_produced = Counter(
    'kafka_messages_produced_total',
    'Total messages produced to Kafka',
    ['topic', 'status']  # status: success/error
)

kafka_messages_consumed = Counter(
    'kafka_messages_consumed_total',
    'Total messages consumed from Kafka',
    ['topic', 'status']  # status: success/error/timeout
)

kafka_producer_errors = Counter(
    'kafka_producer_errors_total',
    'Total Kafka producer errors',
    ['error_type']
)

kafka_consumer_errors = Counter(
    'kafka_consumer_errors_total',
    'Total Kafka consumer errors',
    ['error_type']
)

kafka_poll_attempts = Histogram(
    'kafka_poll_attempts_count',
    'Number of poll attempts needed to find message',
    buckets=[1, 5, 10, 20, 30, 40, 50]
)

active_kafka_consumers = Gauge(
    'active_kafka_consumers',
    'Number of active Kafka consumers'
)

risk_classification_pending = Counter(
    'risk_classification_pending_total',
    'Count of risk classifications still pending'
)

risk_features_parsing_errors = Counter(
    'risk_features_parsing_errors_total',
    'Errors parsing features JSON'
)

risk_groups_distribution = Counter(
    'risk_groups_distribution_total',
    'Distribution of risk group classifications',
    ['risk_group']
)

disease_groups_detected = Counter(
    'disease_groups_detected_total',
    'Count of disease groups detected',
    ['disease_group']
)

kafka_message_payload_size = Histogram(
    'kafka_message_payload_size_bytes',
    'Size of Kafka message payloads',
    ['message_type'],  # message_type: inference_request/risk_classification
    buckets=[100, 500, 1000, 5000, 10000, 50000]
)


class RiskServiceServicer(risk_pb2_grpc.RiskServiceServicer):
    def SubmitRisk(self, request, context):
        start_time = time.time()
        patient_id = str(uuid.uuid4())

        try:
            try:
                features = json.loads(request.features_json)
            except Exception as e:
                risk_features_parsing_errors.inc()
                features = {}
                print(f"Failed to parse features_json: {e}")

            # Remove non-feature fields
            features.pop("name", None)
            features.pop("age", None)
            features.pop("gender", None)

            payload = {
                "patient_id": patient_id,
                "site_id": request.site_id,
                "features": features
            }

            payload_bytes = json.dumps(payload).encode("utf-8")
            kafka_message_payload_size.labels(message_type='inference_request').observe(len(payload_bytes))

            # Produce to Kafka
            try:
                producer.produce(TOPIC, payload_bytes)
                producer.flush()
                kafka_messages_produced.labels(topic=TOPIC, status='success').inc()
                risk_submission_requests.labels(status='success').inc()
                print("Received SubmitRisk payload:", payload)
            except Exception as e:
                kafka_producer_errors.labels(error_type=type(e).__name__).inc()
                kafka_messages_produced.labels(topic=TOPIC, status='error').inc()
                risk_submission_requests.labels(status='error').inc()
                context.set_code(grpc.StatusCode.INTERNAL)
                context.set_details(f"Kafka producer error: {str(e)}")
                raise

            risk_submission_duration.observe(time.time() - start_time)
            return risk_pb2.SubmitResponse(patient_id=patient_id)

        except Exception as e:
            risk_submission_requests.labels(status='error').inc()
            risk_submission_duration.observe(time.time() - start_time)
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(f"Error submitting risk: {str(e)}")
            raise

    def GetRisk(self, request, context):
        consumer = Consumer({
            "bootstrap.servers": "kafka:9092",
            "group.id": f"fetch-{request.patient_id}",
            "auto.offset.reset": "earliest",
            "enable.auto.commit": True,
        })
        consumer.subscribe(["ai.risk.classifications"])

        latest_msg = None
        for _ in range(50):
            msg = consumer.poll(timeout=1.0)
            if msg is None:
                continue
            if msg.error():
                continue
            data = json.loads(msg.value().decode("utf-8"))
            if data.get("patient_id") == request.patient_id:
                latest_msg = data
                break
        consumer.close()

        return risk_pb2.GetResponse(
            patient_id=latest_msg.get("patient_id", ""),
            site_id=latest_msg.get("site_id", ""),
            probs=json.dumps(latest_msg.get("probs")),
            risk_group=latest_msg.get("risk_group", ""),
            disease_groups=json.dumps(latest_msg.get("disease_groups", {})),
        )

def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    risk_pb2_grpc.add_RiskServiceServicer_to_server(RiskServiceServicer(), server)
    server.add_insecure_port("0.0.0.0:50054")
    server.start()
    server.wait_for_termination()


if __name__ == "__main__":
    start_http_server(8003)
    serve()
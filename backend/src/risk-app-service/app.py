
import uuid
import json
import os
from concurrent import futures
import grpc
from confluent_kafka import Producer, Consumer
import risk_pb2
import risk_pb2_grpc

TOPIC = os.getenv("TOPIC_INFER_REQUESTS", "ai.infer.requests")
producer = Producer({"bootstrap.servers": "kafka:9092"})

class RiskServiceServicer(risk_pb2_grpc.RiskServiceServicer):
    def SubmitRisk(self, request, context):
        patient_id = str(uuid.uuid4())

        try:
            features = json.loads(request.features_json)
        except Exception as e:
            features = {}
            print(f"Failed to parse features_json: {e}")

        features.pop("name")
        features.pop("age")
        features.pop("gender")

        payload = {
            "patient_id": patient_id,
            "site_id": request.site_id,
            "features": features
        }

        producer.produce(TOPIC, json.dumps(payload).encode("utf-8"))
        producer.flush()

        print("Received SubmitRisk payload:", payload)
        return risk_pb2.SubmitResponse(patient_id=patient_id)


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
        if not latest_msg:
            return risk_pb2.GetResponse(status="pending", message="Risk classification not yet available.")
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
    serve()

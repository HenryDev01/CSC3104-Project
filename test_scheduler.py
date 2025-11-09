"""
Simple test script to send patient data through the risk classification pipeline
This simulates what the frontend would do when submitting patient data
"""

from kafka import KafkaProducer
import json
import time
import uuid

# Kafka configuration - use localhost:29092 for host machine
KAFKA_BOOTSTRAP = 'localhost:29092'
TOPIC_INFER_REQUESTS = 'ai.infer.requests'

# Initialize Kafka Producer
producer = KafkaProducer(
    bootstrap_servers=[KAFKA_BOOTSTRAP],
    value_serializer=lambda v: json.dumps(v).encode('utf-8')
)

def send_test_patient(patient_num=1):
    """
    Send a test patient for risk classification
    """
    patient_id = str(uuid.uuid4())
    
    # Sample patient features (you can modify these values)
    # These are typical features from the DATA.csv file
    payload = {
        "patient_id": patient_id,
        "site_id": "test_site",
        "features": {
            "avg_daily_steps": 5000 + (patient_num * 1000),
            "hdl": 45 + patient_num,
            "ldl": 130 + (patient_num * 10),
            "cholesterol": 5.5 + (patient_num * 0.5),
            "cacs": 50 + (patient_num * 50),
            "resting_pulse": 70 + patient_num,
            "fbg": 5.5 + (patient_num * 0.3),
            "hba1c": 5.5 + (patient_num * 0.2),
            "lv_mass": 150 + (patient_num * 10),
            "microalbuminuria": 20 + (patient_num * 5),
            "pwv": 8.0 + (patient_num * 0.5),
            "abi": 1.0 + (patient_num * 0.05),
            "serum_creatinine": 0.9 + (patient_num * 0.1),
            "egfr": 90 - (patient_num * 5),
            "uacr": 15 + (patient_num * 10),
            "bp_systolic": 120 + (patient_num * 10),
            "bp_diastolic": 80 + (patient_num * 5),
            "smoking": 0  # 0 = non-smoker, 1 = smoker
        }
    }
    
    # Send to Kafka
    producer.send(TOPIC_INFER_REQUESTS, payload)
    producer.flush()
    
    print(f"✅ Sent test patient #{patient_num}")
    print(f"   Patient ID: {patient_id}")
    print(f"   Features: {len(payload['features'])} features")
    print()
    
    return patient_id

def main():
    print("=" * 60)
    print("SCHEDULER TEST SCRIPT")
    print("=" * 60)
    print()
    
    print("This script will send test patients through the pipeline:")
    print("1. Send patient data → ai.infer.requests topic")
    print("2. Infer service classifies → ai.risk.classifications topic")  
    print("3. Scheduler receives and schedules")
    print()
    
    # Send 3 test patients with varying risk levels
    patient_ids = []
    for i in range(1, 4):
        patient_id = send_test_patient(i)
        patient_ids.append(patient_id)
        time.sleep(0.5)  # Small delay between sends
    
    print("=" * 60)
    print("✅ All test patients sent!")
    print()
    print("Now check the scheduler:")
    print("  curl http://localhost:5005/api/scheduler/queue")
    print("  curl http://localhost:5005/api/scheduler/appointments")
    print("  curl http://localhost:5005/api/scheduler/stats")
    print()
    print("Patient IDs:")
    for pid in patient_ids:
        print(f"  - {pid}")
    print("=" * 60)

if __name__ == "__main__":
    main()

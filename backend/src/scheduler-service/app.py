from flask import Flask, request, jsonify
from flask_cors import CORS
from kafka import KafkaProducer, KafkaConsumer
import json


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


#kafka producer
producer = KafkaProducer(
    bootstrap_servers=['localhost:9092'],
    value_serializer=lambda v: json.dumps(v).encode('utf-8')  # Serialize data to JSON
)

def send_details():
    # simulate classification
    patient = {
        "patient_id":1,
        "priority_score": 0.2, # assume priority score calculated
        "priority_group":"P4", # assume priority group given
        "stability":"Stable"

    }
    producer.send("Risk-Classification", patient)
    producer.flush()

def schedule():
    consumer = KafkaConsumer(
        'Risk-Classification',
        bootstrap_servers=['localhost:9092'],
        auto_offset_reset='earliest',  # Start from the earliest message
        enable_auto_commit=True,
        group_id='risk-group',
        value_deserializer=lambda x: json.loads(x.decode('utf-8'))  # Deserialize data from JSON
    )
    for message in consumer:
        patient = message.value
        priority_score = patient['priority_score']
        priority_group = patient['priority_group']
        patient_status = patient['stability']
        print(priority_group,priority_score,patient_status)

    # algo to schedule


if __name__ == "__main__":
    pass
    #send_details()
    #schedule()
    # app.run(host="0.0.0.0", port=5005,debug=True)
# CSC3104-Project
## Objective
This project aims to build a cloud-native, distributed AI system that predicts risk levels for multiple cardiometabolic disease outcomes (DM, CKD, CVD, HMOD, CHD), and uses these to classify patients into priority groups. Based on this, a scheduling algorithm will assign appointment priority, which optimises care delivery so that high-risk patients are seen sooner, resources are better allocated, and delays are minimised. The use of cloud and distributed systems enables the application to achieve scalability and efficiency. Risk classification and scheduling tasks can be executed in parallel across distributed nodes, allowing the system to handle large volumes of patient data effectively. The infrastructure supports self-healing and automatic scaling, ensuring reliability during peak demand and minimizing downtime in the event of failures.

## DATASET
https://docs.google.com/spreadsheets/d/1Q5UqiDXuWwfzx7V_8h89Ao2iI-fAUSuC/edit?usp=drive_link&ouid=108458773928017206175&rtpof=true&sd=true

## Plan 
We plan to have features that include an authentication system for healthcare practitioners to securely access the platform, a patient’s data input interface where AI classifies the patient’s risk level upon submission, and a scheduling algorithm that prioritizes appointments based on assessed risk with manual confirmation by the doctor (Fig 1). The system also provides a detailed overview of patient information and maintains a comprehensive list of all patients. The architecture will be implemented using a microservices approach: the frontend will utilize Dockerized ReactJS for the user interface and Envoy as middleware to facilitate communication between services. Backend services, including scheduling, patient record CRUD, listing patients, and authentication, will be built with Dockerized Flask applications and will communicate using gRPC. The AI model will be containerized with Docker, using Python and federated learning via TensorFlow  to train on distributed datasets. MariaDB will serve as the relational database. Apache Kafka will be employed to manage asynchronous communication with patient submissions publishing AI-generated risk classifications and a scheduler subscribing to the risk classification. Kubernetes will be used to enable horizontal scaling and replication of microservices to ensure reliability and high availability.

## How to run
1. Stop existing containers when necessary
~~~bash
docker-compose down
~~~

2. Use docker compose
~~~bash  
docker-compose up --build
~~~

3. Go to your localhost with port 3000
~~~bash  
http://localhost:3000
~~~  






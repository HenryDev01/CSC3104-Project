FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ make librdkafka-dev \
    && rm -rf /var/lib/apt/lists/*
COPY . .
RUN pip install  --no-cache-dir -r requirements.txt

RUN mkdir -p /app/app_data /app/models

CMD ["bash"]
from mysql.connector import Error
import mysql.connector
from mysql.connector import pooling
import os
import time


def get_db_connection():
    """Connect to database with retry logic"""
    max_retries = 10
    retry_delay = 2

    for attempt in range(max_retries):
        try:
            print(f"DB connection attempt {attempt + 1}/{max_retries}...")
            connection = mysql.connector.connect(
                host=os.getenv("DB_HOST", "database"),
                port=int(os.getenv("DB_PORT", 3306)),
                user=os.getenv("DB_USER", "user"),
                password=os.getenv("DB_PASSWORD", "pass123"),
                database=os.getenv("DB_NAME", "Project"),
                connect_timeout=10
            )
            if connection.is_connected():
                print("✓ Database connected!")
                return connection
        except Error as e:
            print(f"✗ Attempt {attempt + 1} failed: {e}")
            if attempt < max_retries - 1:
                time.sleep(retry_delay)

    raise Exception("Failed to connect to database after max retries")
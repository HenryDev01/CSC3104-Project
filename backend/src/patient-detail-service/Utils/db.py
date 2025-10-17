import os
import mysql.connector

def get_db_connection():
    try:
        db = mysql.connector.connect(
            host=os.getenv("DB_HOST", "database"),
            user=os.getenv("DB_USER", "user"),
            password=os.getenv("DB_PASSWORD", "pass123"),
            database=os.getenv("DB_NAME", "Project"),
            port=int(os.getenv("DB_PORT", "3306")),
        )
        return db
    except Exception as e:
        print("Database connection failed:", e)
        return None

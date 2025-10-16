import os
import mysql.connector
from mysql.connector import Error

def get_db_connection():
    """
    Establish and return a connection to MariaDB/MySQL database
    using environment variables set in docker-compose.
    """
    try:
        connection = mysql.connector.connect(
            host=os.getenv("DB_HOST", "localhost"),
            port=int(os.getenv("DB_PORT", 3306)),
            user=os.getenv("DB_USER", "user"),
            password=os.getenv("DB_PASSWORD", "pass123"),
            database=os.getenv("DB_NAME", "Project")
        )
        return connection
    except Error as e:
        print(f"Error connecting to database: {e}")
        return None

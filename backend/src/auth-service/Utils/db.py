import mysql.connector

def get_db_connection():
    return mysql.connector.connect(
        host="mariadb",
        user="root",
        password="root123",
        database="Project",
    )

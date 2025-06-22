import os

FILE_DIR = os.path.dirname(__file__)

# from apscheduler.jobstores.redis import RedisJobStore
from apscheduler.jobstores.memory import MemoryJobStore 

class Config(object):
    FLASK_ENV = "production"
    SERVER_FILES = os.path.join(FILE_DIR, "server_files")
    SERVER_FILES = os.path.join(FILE_DIR, "server_files")
    STATIC_FOLDER = os.path.join(SERVER_FILES, "static")
    SHARED_FOLDER = os.path.join(STATIC_FOLDER, "shared")
    EXCEL_SUMMARIES = os.path.join(SHARED_FOLDER, "excels")
    SHARED_PRIVATE_FOLDER = os.path.join(SERVER_FILES, "shared_private")
    SECRET_KEY = os.getenv("FLASK_SECURE_KEY")
    ADMIN_USERNAME = os.getenv("ADMIN_USERNAME")
    ADMIN_PASS = os.getenv("ADMIN_PASS")
    SQLALCHEMY_DATABASE_URI = (
        f"sqlite:///{os.path.join(SHARED_PRIVATE_FOLDER, "gtfs.sqlite3")}"
    )
    GTFS_VALIDATOR_PATH = os.path.join(SERVER_FILES, "gtfs-validator-6.0.0-cli.jar")
    FEEDS_LOCATION = SHARED_FOLDER 
    REDIS_HOST=os.getenv("REDIS_HOST") or "localhost"
    REDIS_PORT = os.getenv("REDIS_PORT") or 6379 
    REDIS_URL=f"redis://{REDIS_HOST}:{REDIS_PORT}/0"
    SCHEDULER_JOBSTORES={ 
        "default":MemoryJobStore(),
    } 
    WTF_CSRF_ENABLED = True
    LOGGING_FILE_PATH = os.path.join(SHARED_PRIVATE_FOLDER, "server.log")
    GTFS_VALIDATOR_RESULT_PATH = os.path.join(SHARED_FOLDER, "result")


class DevConfig(Config):
    DEBUG = True
    FLASK_ENV = "development"
    TESTING = False
    WTF_CSRF_ENABLED = True
    SESSION_COOKIE_DOMAIN = False


class TestConfig(Config):
    DEBUG = False
    FLASK_ENV = "testing"
    TESTING = True
    WTF_CSRF_ENABLED = False
    SESSION_COOKIE_DOMAIN = False
    SQLALCHEMY_DATABASE_URI = f"sqlite:///{os.path.join("gtfs_rt_server","tests","resources", "testgtfs.sqlite3")}"
    FEEDS_LOCATION = os.path.join("gtfs_rt_server", "tests", "resources" )
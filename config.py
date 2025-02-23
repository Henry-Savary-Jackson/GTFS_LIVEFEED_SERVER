import os

FILE_DIR = os.path.dirname(__file__)
class Config(object):
    SERVER_FILES = os.path.join(FILE_DIR, "server_files")
    STATIC_FOLDER = os.path.join(SERVER_FILES, "static")
    SHARED_FOLDER = os.path.join(STATIC_FOLDER, "shared")
    SECRET_KEY = os.getenv("FLASK_SECURE_KEY")
    ADMIN_USERNAME = os.getenv("ADMIN_USERNAME")
    ADMIN_PASS = os.getenv("ADMIN_PASS")
    SQLALCHEMY_DATABASE_URI = f"sqlite:///{os.path.join(SERVER_FILES, "gtfs.sqlite3")}"
    GTFS_VALIDATOR_PATH = os.path.join(SERVER_FILES, "gtfs-validator-6.0.0-cli.jar") 
    FEED_LOCATION = os.path.join(SHARED_FOLDER,"feed.bin") 
    CELERY = dict(
       track_started = True,
        broker_url= f"redis://{os.getenv("REDIS_HOST") or "localhost"}:{os.getenv("REDIS_PORT") or 6379}/0",
        cache_backend= f"redis://{os.getenv("REDIS_HOST") or "localhost"}:{os.getenv("REDIS_PORT") or 6379}/0",
        result_backend= f"redis://{os.getenv("REDIS_HOST") or "localhost"}:{os.getenv("REDIS_PORT") or 6379}/0",
        accept_content=['json'],
        task_serializer='json',
        result_serializer='json'
    )
    WTF_CSRF_ENABLED =True 
    SESSION_COOKIE_DOMAIN =True 


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
    SQLALCHEMY_DATABASE_URI = f"sqlite:///{os.path.join("resources", "testgtfs.sqlite3")}"
    FEED_LOCATION = os.path.join("resources", "feed.bin")

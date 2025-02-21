import os


class Config(object):
    SECRET_KEY = os.getenv("FLASK_SECURE_KEY")
    ADMIN_USERNAME = os.getenv("ADMIN_USERNAME")
    ADMIN_PASS = os.getenv("ADMIN_PASS")
    SQLALCHEMY_DATABASE_URI = f"sqlite:///{os.getenv("DB_PATH")}"
    GTFS_VALIDATOR_PATH = os.getenv("GTFS_VALIDATOR_PATH")
    FEED_LOCATION = os.getenv("FEED_LOCATION")
    CELERY = dict(
       track_started = True,
        broker_url= f"redis://localhost:6379/0",
        cache_backend= f"redis://localhost:6379/0",
        result_backend= f"redis://localhost:6379/0"
    )
    STATIC_PATH = f"{os.path.dirname(__file__)}/gtfs_rt_server/static"


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

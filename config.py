
import os
class Config(object):
    SECRET_KEY = os.getenv("FLASK_SECURE_KEY")
    ADMIN_USERNAME = os.getenv("ADMIN_USERNAME")
    ADMIN_PASS = os.getenv("ADMIN_PASS") 
    SQLALCHEMY_DATABASE_URI = f"sqlite:///{os.getenv("DB_PATH")}"
    GTFS_VALIDATOR_PATH=os.getenv("GTFS_VALIDATOR_PATH")
    FEED_LOCATION = os.getenv("FEED_LOCATION")


class DevConfig(Config):
    DEBUG =True
    FLASK_ENV = 'development'
    TESTING = False 
    WTF_CSRF_ENABLED = True 
    SESSION_COOKIE_DOMAIN = False
 

class TestConfig(Config):
    DEBUG =False
    FLASK_ENV = 'testing'
    TESTING =True 
    WTF_CSRF_ENABLED = False 
    SESSION_COOKIE_DOMAIN = False
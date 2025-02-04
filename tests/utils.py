import pytest
import dotenv
# test db
import tempfile
import os
from flask import Flask
dotenv.load_dotenv()
DB_PATH = os.path.join(os.path.dirname(__file__),"testdb.sqlite3")

@pytest.fixture()
def make_app():
    app = Flask(__name__)
    app.config['SECRET_KEY'] = os.getenv("FLASK_SECURE_KEY") 
    app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite://{DB_PATH}" 
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config["TESTING"] = True

    

# test excel 

# test feed.bin
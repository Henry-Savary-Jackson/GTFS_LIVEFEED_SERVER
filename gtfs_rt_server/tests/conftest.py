import pytest
from gtfs_rt_server.db_utils import insert_user
# test db
from gtfs_rt_server import  init_app
import os
from gtfs_rt_server import db, create_app
from pathlib import Path
from dotenv import load_dotenv

@pytest.fixture(scope="session")
def app():
    load_dotenv(Path(__file__).parent /  "resources"/ ".env")
    os.environ["FLASK_ENVIRON"] = "config.TestConfig"
    app =  init_app()
    with app.app_context():
        insert_user(app.config["ADMIN_USERNAME"], app.config["ADMIN_PASS"])
    
    yield app

@pytest.fixture(scope="function")
def client(app):
    yield app.test_client()
    
def do_action_logged_in(app,client,action):
    auth_actions  = AuthActions(client)
    auth_actions.login(app.config["ADMIN_USERNAME"], app.config["ADMIN_PASS"])
    result = action()
    auth_actions.logout()
    return result

# from https://flask.palletsprojects.com/en/stable/tutorial/tests/#authentication
class AuthActions(object):
    def __init__(self, client):
        self._client = client

    def login(self, username='admin', password='test'):
        response =self._client.post(
            '/auth/login',
            data={'username': username, 'password': password, "remember_me":True}
        )
        return response

    def logout(self):
        return self._client.get('/auth/logout')
# test feed.bin
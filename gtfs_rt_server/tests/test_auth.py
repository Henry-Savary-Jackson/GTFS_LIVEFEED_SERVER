from .conftest import app, client, AuthActions
import random
from flask_login import current_user
from flask import g

def test_login(app, client):
    auth =AuthActions(client)
    response = auth.login(app.config["ADMIN_USERNAME"], app.config["ADMIN_PASS"])
    assert "GTFS Server" in response.text


def test_logout(app, client):
    auth =AuthActions(client)
    response = auth.login(app.config["ADMIN_USERNAME"], app.config["ADMIN_PASS"])
    assert "GTFS Server" in response.text
    response = auth.logout()
    assert "Login"  in response.text


def test_login_user_doesnt_exist(app, client):
    auth =AuthActions(client)
    response = auth.login("".join([str(random.randrange(0, 10)) for i in range(12)]), app.config["ADMIN_PASS"])
    assert response.status_code == 400 
    assert "No such user" in response.text

def test_login_wrong_password(app, client):
    auth =AuthActions(client)
    response = auth.login(app.config["ADMIN_USERNAME"], "".join([str(random.randrange(0, 10)) for i in range(12)]))
    assert response.status_code == 400 
    assert "Wrong password" in response.text

def test_login_malformed(app, client):
    response = client.post("/auth/login", data="".join([str(random.randrange(0, 10)) for i in range(12)])) 
    assert response.status_code == 400

def test_logout_unauthenticated(app, client):
    auth =AuthActions(client)
    response =  auth.logout()
    assert response.status_code == 200
    assert "Login" in response.text 




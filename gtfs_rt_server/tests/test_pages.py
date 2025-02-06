from .conftest import app, client, do_action_logged_in
def test_index_logged_in(app, client):
    def action():
        response = client.get("/",follow_redirects=True  )
        assert "GTFS Server" in response.text 
    do_action_logged_in(app, client,action)

def test_index_logged_out(client):
    response = client.get("/",follow_redirects=True  )
    assert "Login" in response.text


from gtfs_rt_server import  init_app, socketio
from gtfs_rt_server.db_utils import insert_user, add_role, get_user_by_username
from dotenv import load_dotenv
load_dotenv()
app = init_app()

with app.app_context():
    add_role("admin")
    add_role("user")
    if not get_user_by_username("admin"):
        insert_user(app.config["ADMIN_USERNAME"], app.config["ADMIN_PASS"], ["admin"])


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, ssl_context=("fullchain.pem", "privkey.pem"))

from gtfs_rt_server.db_utils import insert_user, add_role
from app import app
if __name__=="__main__":
    with app.app_context():
        add_role("admin")
        add_role("user")
        insert_user(app.config["ADMIN_USERNAME"], app.config["ADMIN_PASS"], ["admin"])


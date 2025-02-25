

from gtfs_rt_server import  init_app
from gtfs_rt_server.db_utils import insert_user
from dotenv import load_dotenv

load_dotenv()
app = init_app()
with app.app_context():
    insert_user(app.config["ADMIN_USERNAME"], app.config["ADMIN_PASS"])
celery_app = app.extensions["celery"]

if __name__ == "__main__":
    app.run(host="0.0.0.0")

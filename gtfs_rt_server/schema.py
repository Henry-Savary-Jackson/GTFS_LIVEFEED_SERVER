from flask_login import UserMixin
from flask_sqlalchemy import model
from gtfs_rt_server import db
from typing import Optional
from uuid import uuid4
class User(UserMixin, db.Model):

    user_id = db.Column(db.String(36), default=str(uuid4()),primary_key=True)
    username = db.Column(db.String(100), unique=True)
    hash_pass = db.Column( db.String(100), nullable=False)

    def get_id(self):
        return self.username

def get_user_by_username(username) -> Optional[User]:
    with db.session.begin():
        return User.query.filter_by(username=username).first()

     

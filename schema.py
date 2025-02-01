from flask_login import UserMixin
from flask_sqlalchemy import model
from config import db, app
from uuid import uuid4

class User(UserMixin, db.Model):

    user_id = db.Column(db.String(36), default=str(uuid4()),primary_key=True)
    username = db.Column(db.String(100), unique=True)
    hash_pass = db.Column( db.String(100), nullable=False)

    def get_id(self):
        return self.username

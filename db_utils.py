from schema import User, db
from config import login_manager, password_hasher
from typing import Optional
@login_manager.user_loader
def get_user_by_username(username) -> Optional[User]:
    return User.query.filter_by(username=username).first()

def insert_user(username, rawPassword):

    user = User(username=username, hash_pass=  password_hasher.hash(rawPassword))
    try : 
        with db.session.begin() :
            db.session.add(user)
            db.session.commit()
    except Exception as e:
        db.session.rollback()

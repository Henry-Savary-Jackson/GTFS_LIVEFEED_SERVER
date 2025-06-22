import enum
from flask_sqlalchemy import model, SQLAlchemy
from flask_login import UserMixin
from typing import Optional
from uuid import uuid4

db = SQLAlchemy()

roles_users = db.Table('roles_users',
    db.Column('user_id', db.String(36), db.ForeignKey('user.user_id')),
    db.Column('role_id', db.String(20), db.ForeignKey('role.id'))
)

class User(UserMixin, db.Model):
    __tablename__="user"
    user_id = db.Column(db.String(36), default=lambda:str(uuid4()), primary_key=True)
    username = db.Column(db.String(100), unique=True)
    hash_pass = db.Column(db.String(100), nullable=False)
    roles = db.relationship('Role', secondary=roles_users , backref=["users", {"lazy":True} ])
    def get_id(self):
        return self.username


def get_user_by_username(username) -> Optional[User]:
    with db.session.begin():
        return User.query.filter_by(username=username).first()

class Role( db.Model):
    __tablename__="role"
    id = db.Column(db.String(36), default=lambda:str(uuid4()), primary_key=True)
    name = db.Column(db.String(20) , unique=True, nullable=False)

class Causes(enum.Enum):
    UNKNOWN_CAUSE = "UNKNOWN_CAUSE"
    OTHER_CAUSE = "OTHER_CAUSE"
    TECHNICAL_PROBLEM = "TECHNICAL_PROBLEM"
    STRIKE = "STRIKE"
    DEMONSTRATION = "DEMONSTRATION"
    ACCIDENT = "ACCIDENT"
    HOLIDAY = "HOLIDAY"
    WEATHER = "WEATHER"
    MAINTENANCE = "MAINTENANCE"
    CONSTRUCTION = "CONSTRUCTION"
    POLICE_ACTIVITY = "POLICE_ACTIVITY"
    MEDICAL_EMERGENCY = "MEDICAL_EMERGENCY"


class Effects(enum.Enum):

    NO_SERVICE = "NO_SERVICE"
    REDUCED_SERVICE = "REDUCED_SERVICE"
    SIGNIFICANT_DELAYS = "SIGNIFICANT_DELAYS"
    DETOUR = "DETOUR"
    ADDITIONAL_SERVICE = "ADDITIONAL_SERVICE"
    MODIFIED_SERVICE = "MODIFIED_SERVICE"
    OTHER_EFFECT = "OTHER_EFFECT"
    UNKNOWN_EFFECT = "UNKNOWN_EFFECT"
    STOP_MOVED = "STOP_MOVED"
    NO_EFFECT = "NO_EFFECT"
    ACCESSIBILITY_ISSUE = "ACCESSIBILITY_ISSUE"


class EntityTypes(enum.Enum):
    stops = "stops"
    trips = "trips"
    routes = "routes"


class InformedEntityToAlerts(db.Model):
    __tablename__ = "alerts_to_entities"
    alert_id = db.Column(db.String(36), db.ForeignKey("alerts.alert_id"), primary_key=True)
    entity_id = db.Column(db.String(36), primary_key=True)
    entity_type = db.Column(db.Enum(EntityTypes))


class Alert(db.Model):
    __tablename__ = "alerts"
    alert_id = db.Column(db.String(36), default=lambda:str(uuid4()), primary_key=True)
    start_time = db.Column(db.Integer())
    end_time = db.Column(db.Integer())
    cause = db.Column(db.Enum(Causes))
    effect = db.Column(db.Enum(Effects))
    entities = db.relationship(
        "InformedEntityToAlerts", backref="alert"
    )


class TripUpdateToStop(db.Model):
    __tablename__ = "trip_update_to_stops"
    trip_update_id = db.Column(
        db.String(36), db.ForeignKey("trip_update.trip_id"), primary_key=True
    )
    stop_id = db.Column(db.String(36), primary_key=True)
    delay = db.Column(db.Integer())
    skip = db.Column(db.Boolean())


class TripUpdate(db.Model):
    __tablename__ = "trip_update"
    trip_update_id = db.Column(db.String(36), default=lambda:str(uuid4()), primary_key=True)
    trip_id = db.Column(db.String(36), nullable=False)
    stops = db.relationship(
        "TripUpdateToStop" , backref="trip_update"
    )
    route_id =  db.Column(db.String(36), nullable=False)
    cancelled = db.Column(db.Boolean())

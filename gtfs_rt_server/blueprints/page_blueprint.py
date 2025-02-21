
from flask import Blueprint,render_template 
from flask_login import login_required

page_bp =  Blueprint("pages", __name__)
@page_bp.get("/")
def main_page():
    return render_template("index.html")


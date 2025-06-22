
from flask import Blueprint,render_template 

page_bp =  Blueprint("pages", __name__)

@page_bp.get("/service_alert")
@page_bp.get("/trip_update")
@page_bp.get("/upload_gtfs")
@page_bp.get("/")
def main_page():
    return render_template("index.html")



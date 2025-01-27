

from flask import Flask,request 
from make_gtfs.make_gtfs import 

app = Flask(__name__)

@app.route("/upload_gtfs", methods=["POST"])
def upload_gtfs():
    file = request.files["gtfs.xlsx"]
    file.save("static/gtfs.xlsx")



if __name__ == "__main__":
    app.run()

from flask import Blueprint,request , make_response, redirect, url_for, render_template
from wtforms import BooleanField, StringField,RadioField,SearchField,PasswordField, validators, SubmitField, FileField
from flask_login import login_required
from flask_wtf import FlaskForm

gtfs_blueprint = Blueprint("gtfs", __name__, url_prefix="/gtfs")

class GTFSFileUploadForm(FlaskForm):
    file = FileField(label="Upload GTFS file", validators=[validators.DataRequired() ])
    submit = SubmitField()

@gtfs_blueprint.route("/upload_gtfs", methods=["GET", "POST"])
@login_required
def upload_gtfs():

    file_form = GTFSFileUploadForm()
    if request.method == "POST" and file_form.validate_on_submit():
        file = file_form.data["file"]
    ## add dataframes to sqlite databases   
        result_path = "static/result"
        try :
            df_dict = generate_gtfs_zip(file, "static")
            ## read notices in report.json
            if not os.path.exists("static/result"):
                return render_template("gtfs_upload.html", form=file_form, error="couldn't find validation report"), 400 
            if has_errors("static/result"):
                os.remove("static/gtfs.zip") 
            else:
                add_gtfs_tables_to_db(db.engine,df_dict)

            return redirect("/static/result/report.html")
            
        except Exception as e:
            return render_template("gtfs_upload.html", form=file_form, error=str(e)) , 400
    return render_template("gtfs_upload.html", form=file_form)
    ## give error if errors in report.json


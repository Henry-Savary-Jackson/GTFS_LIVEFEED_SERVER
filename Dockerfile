FROM python:3.12-alpine

RUN apk add --update openjdk11 curl

RUN mkdir flask-app

WORKDIR /flask-app 
COPY requirements.txt .

RUN pip3 install --upgrade pip && pip install -r requirements.txt

WORKDIR /flask-app
COPY config.py app.py ./
RUN mkdir server_files
RUN mkdir server_files/shared_private
RUN mkdir server_files/static
COPY gtfs_rt_server ./gtfs_rt_server


WORKDIR /flask-app

RUN addgroup flaskuser
RUN adduser -G flaskuser -D -h /flask-app flaskuser

RUN chown -R  flaskuser:flaskuser ./server_files
RUN chmod -R u+rw ./server_files

USER flaskuser

CMD gunicorn --worker-class gevent -b 0.0.0.0:5000 --timeout=300 --log-level=debug --log-file server_files/shared_private/server.log app:app & celery -A app.celery_app  worker -B --logfile server_files/shared_private/celery.log 
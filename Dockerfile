FROM python:3.12-alpine

RUN apk add --update nodejs npm openjdk11 curl

RUN mkdir flask-app

WORKDIR /flask-app 
COPY requirements.txt .

RUN pip3 install --upgrade pip && pip install -r requirements.txt

RUN mkdir frontend 
WORKDIR /flask-app/frontend
COPY frontend/package.json .
RUN npm install  --only=production
COPY frontend/public ./public
COPY frontend/src ./src
RUN npm run build

WORKDIR /flask-app
COPY .env config.py app.py ./
RUN mkdir server_files
RUN mkdir server_files/shared_private
RUN mkdir server_files/static
COPY server_files/*.jar server_files/
COPY gtfs_rt_server ./gtfs_rt_server

WORKDIR /flask-app/frontend
RUN cp -r build/static/* /flask-app/server_files/static/
RUN cp -f build/index.html  /flask-app/gtfs_rt_server/templates/index.html

WORKDIR /flask-app

EXPOSE 5000
EXPOSE 5555

RUN addgroup flaskuser
RUN adduser -G flaskuser -D -h /flask-app flaskuser

RUN chown -R  flaskuser:flaskuser ./server_files
RUN chmod -R u+rw ./server_files

USER flaskuser

CMD gunicorn --worker-class eventlet -b 0.0.0.0:5000 --log-level=debug --log-file server_files/shared_private/server.log app:app & celery -A app.celery_app  worker -B --logfile server_files/shared_private/celery.log & celery -A app.celery_app flower 
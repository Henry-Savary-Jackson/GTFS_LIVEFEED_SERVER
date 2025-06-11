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
# RUN echo $(ls -al) && sleep 10
RUN npm run build

WORKDIR /flask-app
COPY .env fullchain.pem privkey.pem config.py app.py ./
COPY server_files ./server_files
COPY gtfs_rt_server ./gtfs_rt_server

WORKDIR /flask-app/frontend
RUN rm /flask-app/server_files/static/js/*
RUN cp -r build/static/* /flask-app/server_files/static/
RUN cp -f build/index.html  /flask-app/gtfs_rt_server/templates/index.html

WORKDIR /flask-app

EXPOSE 5000

RUN addgroup flaskuser
RUN adduser -G flaskuser -D -h /flask-app flaskuser

RUN chown -R  flaskuser:flaskuser ./server_files
RUN chmod -R u+rw ./server_files
RUN chown -R  flaskuser:flaskuser *.pem
USER flaskuser


CMD gunicorn -b 0.0.0.0:5000 --certfile fullchain.pem --keyfile privkey.pem --log-level=debug  --log-file server_files/shared_private/server.log app:app app:app  & celery -A app.celery_app  worker --logfile ~/server_files/shared_private/celery.log

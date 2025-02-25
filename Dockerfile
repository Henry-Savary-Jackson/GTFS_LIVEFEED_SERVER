FROM python:3.12-alpine

COPY requirements.txt .
RUN pip3 install --upgrade pip && pip install -r requirements.txt
RUN apk add --update nodejs npm

COPY .env .
COPY frontend ./frontend
RUN rm -rf frontend/node_modules
WORKDIR /frontend
RUN npm install  --only=production
RUN npm run build
WORKDIR /
COPY config.py app.py ./
COPY gtfs_rt_server ./gtfs_rt_server
COPY server_files ./server_files
WORKDIR /frontend
RUN cp -r build/static/* ../server_files/static/
RUN cp -f build/index.html  ../gtfs_rt_server/templates/index.html
WORKDIR /
RUN apk add curl
RUN apk add openjdk11
EXPOSE 5000
CMD flask run --host=0.0.0.0 & celery -A app.celery_app  worker --logfile /server_files/shared_private/celery.log

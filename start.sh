#!/bin/bash

source .venv/bin/activate

docker run --name=redis_cont redis:latest -d
sudo cp -f nginx_conf/nginx.conf /etc/nginx/nginx.conf
sudo chmod o=r /etc/nginx/nginx.conf
sudo nginx

gunicorn --worker-class eventlet -b 0.0.0.0:5000 --log-level=debug --log-file server_files/shared_private/server.log app:app & celery -A app.celery_app  worker -B --logfile server_files/shared_private/celery.log & celery -A app.celery_app   flower
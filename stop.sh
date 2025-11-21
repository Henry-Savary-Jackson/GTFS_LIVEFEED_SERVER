#!/bin/bash


pkill gunicorn
pkill celery
docker stop redis_cont
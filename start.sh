#!/bin/bash

docker compose build build-flask
docker compose up wc redis_db reverse-proxy -d 
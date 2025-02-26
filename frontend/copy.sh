#!/bin/bash
npm run build
rm ../server_files/static/js/*
cp -r build/static/* ../server_files/static/
cp -f build/index.html  ../gtfs_rt_server/templates/index.html

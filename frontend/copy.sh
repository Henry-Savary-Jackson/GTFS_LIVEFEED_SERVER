#!/bin/bash


export REACT_APP_REGION_NAME=$1
export REACT_APP_REGION=$1
echo $REACT_APP_REGION $REACT_APP_REGION_NAME
npm run build
rm ../server_files/static/js/*
cp -r build/static/* ../server_files/static/
cp -f build/static_wc/* ../server_files/static/
cp -f build/index.html  ../gtfs_rt_server/templates/index.html
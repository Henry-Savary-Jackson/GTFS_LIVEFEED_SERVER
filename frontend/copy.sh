#!/bin/bash

export REACT_APP_REGION_NAME=$2
export REACT_APP_REGION=$1
npm run build
rm ../server_files/static/$REACT_APP_REGION/static/js/*
cp public/static/*  ../server_files/static/
mkdir -p ../server_files/static/$REACT_APP_REGION/static/js/
cp -r build/static/js/* ../server_files/static/$REACT_APP_REGION/static/js/
cp -f build/static_$REACT_APP_REGION/* ../server_files/static/$REACT_APP_REGION/
cp -f build/index.html  ../server_files/static/$REACT_APP_REGION/index.html
#!/bin/bash

sudo apt install python3-certbot-nginx nodejs npm default-jdk curl

cd frontend

npm install  --only=production
./copy.sh

cd ..

python3.12 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip && pip install -r requirements.txt

sudo cp -f nginx_conf/nginx.conf /etc/nginx/nginx.conf
sudo chmod o=r /etc/nginx/nginx.conf
sudo ln -sf $PWD/server_files/shared_private/nginx /var/log/nginx

sudo ufw allow 443
sudo ufw allow 80 
sudo ufw allow 5555 

sudo systemctl enable nginx



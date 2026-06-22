FROM jwilder/nginx-proxy:latest

RUN apk add certbot certbot-nginx

ARG domain


RUN echo "0 12 * * * /usr/bin/certbot renew --quiet" >>  /etc/cron/crontab
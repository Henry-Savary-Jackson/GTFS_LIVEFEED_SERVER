from gtfs_rt_server import init_celery_app, init_app

celery_app = init_celery_app(init_app())
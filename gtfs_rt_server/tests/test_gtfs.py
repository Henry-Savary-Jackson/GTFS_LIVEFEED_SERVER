
from gtfs_rt_server.make_gtfs import generate_gtfs_zip
from gtfs_rt_server.tests.conftest import app
from tempfile import mkstemp


def test_valid_gtfs(app):
    generate_gtfs_zip()
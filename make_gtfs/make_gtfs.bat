@echo off

if EXIST .venv (
    call .venv\\Scripts\\activate.bat
) else (
    python3 -m venv .venv
    call .venv\\Scripts\\activate.bat
    pip install -r requirements.txt
)

python make_gtfs.py


deactivate

#!/bin/bash


if [[  ! -d .venv ]]; then
    python3 -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt
else
    source .venv/bin/activate
fi

python make_gtfs.py
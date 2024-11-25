#!/bin/bash

gunicorn -k eventlet -w 1 myapp:app --bind 0.0.0.0:80
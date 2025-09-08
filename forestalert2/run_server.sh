#!/bin/bash
echo "Starting Forest Alert local server on http://localhost:8000"
echo "(Press CTRL+C to stop)"
python3 -m http.server 8000

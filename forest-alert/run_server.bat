@echo off
echo Starting Forest Alert local server on http://localhost:8000
echo (Press CTRL+C to stop)
python -m http.server 8000
pause

from flask import Flask

from api.health import get_health_payload

app = Flask(__name__)


@app.get("/health")
@app.get("/api/health")
def health():
    return get_health_payload(), 200


@app.get("/")
@app.get("/api")
def index():
    return {
        "message": "Hello from Python backend on Vercel",
        "status": "ok",
    }, 200

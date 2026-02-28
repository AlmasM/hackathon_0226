from dotenv import load_dotenv
from flask import Flask
from flask_cors import CORS

from api.health import get_health_payload

load_dotenv()

app = Flask(__name__)
CORS(app)


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

from api.index import app


def run() -> None:
    print("Backend dev server running at http://localhost:8000")
    app.run(host="0.0.0.0", port=8000)


if __name__ == "__main__":
    run()

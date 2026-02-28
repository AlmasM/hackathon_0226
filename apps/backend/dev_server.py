from http.server import HTTPServer

from api.index import handler


def run() -> None:
    server = HTTPServer(("0.0.0.0", 8000), handler)
    print("Backend dev server running at http://localhost:8000")
    server.serve_forever()


if __name__ == "__main__":
    run()

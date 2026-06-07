from fastapi import FastAPI

app = FastAPI(title="This is London")

last_tfl_fetch = None


@app.get("/health")
def health():
    return {"status": "ok", "last_tfl_fetch": last_tfl_fetch}

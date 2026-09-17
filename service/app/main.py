from dataclasses import asdict

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .config import ALLOWED_ORIGINS
from .firebase_client import fetch_orders_df, resolve_cafe_id
from .forecasting import run_forecast

app = FastAPI(title="Flora Cafe - Talep Tahmini Servisi")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/forecast/{cafe_slug}")
def forecast(cafe_slug: str, metric: str = "item_count", horizon_days: int = 7):
    if metric not in ("item_count", "total_price"):
        raise HTTPException(status_code=400, detail="metric 'item_count' veya 'total_price' olmalı")

    cafe_id = resolve_cafe_id(cafe_slug)
    if cafe_id is None:
        raise HTTPException(status_code=404, detail=f"'{cafe_slug}' slug'ına sahip kafe bulunamadı")

    df = fetch_orders_df(cafe_id)
    result = run_forecast(df, value_col=metric, horizon_days=horizon_days)
    return asdict(result)

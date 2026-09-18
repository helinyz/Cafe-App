from dataclasses import asdict

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .config import ALLOWED_ORIGINS
from .firebase_client import (
    fetch_menu_items,
    fetch_order_item_baskets,
    fetch_orders_df,
    resolve_cafe_id,
)
from .forecasting import run_forecast
from .recommendations import build_cooccurrence, recommend

app = FastAPI(title="Flora Cafe - AI Servisleri")

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


@app.get("/recommendations/{cafe_slug}")
def recommendations(cafe_slug: str, cart_item_ids: str = "", limit: int = 4):
    cafe_id = resolve_cafe_id(cafe_slug)
    if cafe_id is None:
        raise HTTPException(status_code=404, detail=f"'{cafe_slug}' slug'ına sahip kafe bulunamadı")

    cart_ids = [c for c in cart_item_ids.split(",") if c]
    if not cart_ids:
        raise HTTPException(status_code=400, detail="cart_item_ids en az bir ürün id'si içermeli")

    menu_items = fetch_menu_items(cafe_id)
    baskets = fetch_order_item_baskets(cafe_id, menu_items)
    cooccurrence = build_cooccurrence(baskets)

    result = recommend(cart_ids, menu_items, cooccurrence, limit=limit)
    return {"items": result.items, "reason": result.reason}

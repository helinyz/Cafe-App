from __future__ import annotations

import firebase_admin
from firebase_admin import credentials, firestore
import pandas as pd

from .config import FIREBASE_SERVICE_ACCOUNT_PATH

_app = None


def get_db():
    global _app
    if _app is None:
        cred = credentials.Certificate(FIREBASE_SERVICE_ACCOUNT_PATH)
        _app = firebase_admin.initialize_app(cred)
    return firestore.client()


def resolve_cafe_id(cafe_slug: str) -> str | None:
    db = get_db()
    query = db.collection("cafes").where("slug", "==", cafe_slug).limit(1)
    docs = list(query.stream())
    if not docs:
        return None
    return docs[0].id


def fetch_orders_df(cafe_id: str) -> pd.DataFrame:
    """Sipariş geçmişini DataFrame olarak döner.

    "hesap" (adisyon isteme) kayıtları gerçek ürün talebi taşımadığı için
    (totalPrice=0, items yok) talep tahmininden hariç tutulur.
    """
    db = get_db()
    orders_ref = db.collection("cafes").document(cafe_id).collection("orders")
    docs = orders_ref.stream()

    rows = []
    for doc in docs:
        data = doc.to_dict()
        if data.get("status") == "hesap":
            continue
        created_at = data.get("createdAt")
        if created_at is None:
            continue
        # Firestore Timestamp'leri tz-aware (UTC) dönüyor; Prophet tz-naive
        # bir 'ds' kolonu bekliyor, o yüzden burada tz bilgisini düşürüyoruz
        # (yerel saat dilimine çevirmek forecast granülaritesi günlük olduğu
        # için bu aşamada gerekli değil).
        created_at = pd.Timestamp(created_at).tz_localize(None)
        rows.append(
            {
                "created_at": created_at,
                "total_price": data.get("totalPrice", 0) or 0,
                "item_count": sum(i.get("qty", 0) for i in (data.get("items") or [])),
            }
        )

    if not rows:
        return pd.DataFrame(columns=["created_at", "total_price", "item_count"])

    df = pd.DataFrame(rows).sort_values("created_at")
    return df


def fetch_menu_items(cafe_id: str) -> list[dict]:
    db = get_db()
    docs = db.collection("cafes").document(cafe_id).collection("menu").stream()
    return [{"id": d.id, **d.to_dict()} for d in docs]


def fetch_order_item_baskets(cafe_id: str, menu_items: list[dict]) -> list[set[str]]:
    """Her siparişin hangi menü ürünlerini (id) içerdiğini döner.

    Sipariş kayıtlarında ürün adı, siparişi veren müşterinin dil seçimine
    göre TR veya EN olarak saklanıyor (bkz. CustomerPage.placeOrder), o
    yüzden eşleştirme hem `name` hem `nameEN` üzerinden yapılıyor.
    """
    name_to_id: dict[str, str] = {}
    for item in menu_items:
        for key in ("name", "nameEN"):
            value = item.get(key)
            if value:
                name_to_id[value.strip().lower()] = item["id"]

    db = get_db()
    orders_ref = db.collection("cafes").document(cafe_id).collection("orders")
    baskets = []
    for doc in orders_ref.stream():
        data = doc.to_dict()
        if data.get("status") == "hesap":
            continue
        basket = set()
        for order_item in data.get("items") or []:
            name = (order_item.get("name") or "").strip().lower()
            item_id = name_to_id.get(name)
            if item_id:
                basket.add(item_id)
        if len(basket) >= 2:
            baskets.append(basket)
    return baskets

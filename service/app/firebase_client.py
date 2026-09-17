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

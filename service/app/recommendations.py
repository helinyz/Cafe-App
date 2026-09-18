from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass


@dataclass
class Recommendation:
    items: list[dict]
    reason: str  # "co_occurrence" | "category" | "none"


def build_cooccurrence(baskets: list[set[str]]) -> dict[str, dict[str, int]]:
    """Sipariş sepetlerinden ürün-ürün birlikte-geçme (co-occurrence) sayımı.

    Klasik association-rule / item-to-item öneri mantığının basitleştirilmiş
    hali: "bu ürünü alanlar sıklıkla bunu da almış" sinyali. Kullanıcı
    hesabı olmadığı için (bkz. proje planı) kişi bazlı collaborative
    filtering yerine bu yaklaşım kullanılıyor.
    """
    cooc: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    for basket in baskets:
        items = list(basket)
        for i, a in enumerate(items):
            for b in items[i + 1:]:
                cooc[a][b] += 1
                cooc[b][a] += 1
    return cooc


def recommend(
    cart_item_ids: list[str],
    menu_items: list[dict],
    cooccurrence: dict[str, dict[str, int]],
    limit: int = 4,
) -> Recommendation:
    menu_by_id = {item["id"]: item for item in menu_items}
    cart_set = set(cart_item_ids)

    def is_offerable(item_id: str) -> bool:
        item = menu_by_id.get(item_id)
        if item is None or item_id in cart_set:
            return False
        return item.get("available", True) is not False

    scores: dict[str, int] = defaultdict(int)
    for cart_id in cart_item_ids:
        for other_id, count in cooccurrence.get(cart_id, {}).items():
            if is_offerable(other_id):
                scores[other_id] += count

    ranked = sorted(scores.items(), key=lambda kv: kv[1], reverse=True)
    reason = "co_occurrence"

    if not ranked:
        # Soğuk başlangıç / veri yok: sepetteki ürünlerle aynı kategorideki
        # diğer ürünleri öner (kategori benzerliği).
        cart_categories = {
            menu_by_id[c]["category"] for c in cart_item_ids if c in menu_by_id
        }
        candidates = [
            item for item in menu_items
            if item.get("category") in cart_categories and is_offerable(item["id"])
        ]
        ranked = [(item["id"], 0) for item in candidates]
        reason = "category" if ranked else "none"

    result_items = [
        {**menu_by_id[item_id], "score": score}
        for item_id, score in ranked[:limit]
    ]
    return Recommendation(items=result_items, reason=reason)

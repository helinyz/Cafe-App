from __future__ import annotations

import json

import requests

from .config import OLLAMA_MODEL, OLLAMA_URL

# Menü, bu ölçekte (~20 ürün) tüm içeriğiyle bir LLM context penceresine
# rahatça sığıyor. Bu yüzden embedding tabanlı top-k retrieval yerine
# bilinçli olarak tüm aktif menüyü context olarak veriyoruz — bu, retrieval
# aşamasının yanlışlıkla ilgili bir ürünü atlaması riskini (retrieval
# kaynaklı halüsinasyon) tamamen ortadan kaldırıyor. Menü büyüdükçe bu
# tasarım kararı embedding tabanlı retrieval'e geçilerek revize edilmeli
# (bkz. SRS / tez metni).

SYSTEM_PROMPT_TR = """Sen Flora Cafe için bir menü asistanısın. SADECE aşağıda verilen MENÜ BİLGİSİ bölümündeki bilgiyi kullanarak cevap ver.

Kurallar:
- Soru bir ürün/menü sorusu değilse (selamlaşma, teşekkür, genel sohbet vb.), kısaca ve doğal bir şekilde karşılık ver, menü hakkında yardımcı olabileceğini belirt. Bunu "menümüzde bu ürün yok" gibi yorumlama; bu durumda grounded=true kabul edilir.
- Bir ürün MENÜ BİLGİSİ listesinde hiç yoksa, "menümüzde bu ürün yok" demek GEÇERLİ ve grounded bir cevaptır (listenin tamamına bakıp yokluğunu teyit ediyorsun).
- Ama ürün menüde VARSA ve istenen bilgi (özellikle alerjen/içerik bilgisi) o ürünün verisinde açıkça yazmıyorsa, "bu bilgi elimde yok, lütfen personele sor" gibi net bir ifadeyle söyle. Açıklamada bir alerjenin GEÇMEMESİ, o alerjenin ürünte OLMADIĞI anlamına gelmez — bunu asla ima etme.
- Menü verisinde hiçbir ürün için bulunmayan konularda (satış/popülerlik/en çok satan, stok durumu, malzeme oranları, kalori/besin değeri vb.) ASLA tahmin etme veya uydurma cevap verme; bu bilgi verilmemişse mutlaka "elimde yok" de.
- Kısa ve net cevap ver (en fazla 3 cümle).
- SADECE şu JSON formatında cevap ver, başka hiçbir metin ekleme: {"answer": "<cevabın>", "grounded": true veya false}
  "grounded": true  -> cevap tamamen ve doğrudan MENÜ BİLGİSİ'ndeki bir alandan geliyor (uydurma/çıkarım değil)
  "grounded": false -> istenen bilgi MENÜ BİLGİSİ'nde yok, kullanıcıyı personele yönlendirdin
"""

SYSTEM_PROMPT_EN = """You are a menu assistant for Flora Cafe. Answer ONLY using the MENU INFO section below.

Rules:
- If the question isn't about a menu item at all (greetings, thanks, small talk), respond briefly and naturally, and mention you can help with the menu. Don't interpret this as "item not on menu"; treat it as grounded=true.
- If an item is simply absent from the MENU INFO list, saying "we don't have that on the menu" IS a valid, grounded answer (you checked the full list).
- But if the item DOES exist and the requested info (especially allergen/ingredient info) is not explicitly stated for it, say so clearly with something like "I don't have this information, please ask staff." An allergen NOT being mentioned in the description does NOT mean the item is free of it — never imply that.
- For anything not present in the menu data for ANY item (sales/popularity/bestsellers, stock levels, ingredient ratios, calories/nutrition, etc.), NEVER guess or fabricate an answer; always say you don't have that information.
- Keep answers short and clear (max 3 sentences).
- Respond ONLY in this JSON format, no other text: {"answer": "<your answer>", "grounded": true or false}
  "grounded": true  -> the answer comes entirely and directly from a field in MENU INFO (not inferred or fabricated)
  "grounded": false -> the requested info isn't in MENU INFO, you directed the user to ask staff
"""


def format_menu_context(menu_items: list[dict]) -> str:
    lines = []
    for item in menu_items:
        if item.get("available") is False or item.get("status") == "Pasif":
            continue
        glutensiz_val = item.get("glutensiz")
        if glutensiz_val is True:
            gluten = "Evet (glutensiz)"
        elif glutensiz_val is False:
            gluten = "Hayır (gluten içerir)"
        else:
            gluten = "Belirtilmemiş"
        lines.append(
            f"- {item.get('name')} / {item.get('nameEN') or item.get('name')} | "
            f"Kategori: {item.get('category')} | Fiyat: {item.get('price')}TL | "
            f"Glutensiz: {gluten} | Açıklama: {item.get('description') or '-'}"
        )
    return "\n".join(lines)


def ask(question: str, menu_items: list[dict], lang: str = "tr") -> dict:
    context = format_menu_context(menu_items)
    system_prompt = SYSTEM_PROMPT_TR if lang == "tr" else SYSTEM_PROMPT_EN
    prompt = f"MENÜ BİLGİSİ / MENU INFO:\n{context}\n\nSORU / QUESTION: {question}"

    response = requests.post(
        f"{OLLAMA_URL}/api/generate",
        json={
            "model": OLLAMA_MODEL,
            "system": system_prompt,
            "prompt": prompt,
            "stream": False,
            "format": "json",
            "options": {"temperature": 0.1},
        },
        timeout=60,
    )
    response.raise_for_status()
    raw = response.json().get("response", "")

    try:
        parsed = json.loads(raw)
        answer = parsed.get("answer") or raw
        grounded = bool(parsed.get("grounded", False))
    except json.JSONDecodeError:
        answer = raw
        grounded = False

    used_item_ids = [
        item["id"] for item in menu_items
        if item.get("available") is not False and item.get("status") != "Pasif"
    ]
    return {"answer": answer, "grounded": grounded, "context_item_ids": used_item_ids}

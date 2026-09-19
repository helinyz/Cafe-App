"""RAG asistanının groundedness (dayanaklılık) değerlendirmesi.

Faz 3'ün tez açısından asıl katkısı: modelin kendi bildirdiği "grounded"
bayrağının, elle etiketlenmiş beklenen değerle ne kadar örtüştüğünü
ölçmek. Bu script `qa_set.json`'daki her soruyu canlı asistana sorar ve
bir doğruluk raporu üretir.

Kullanım:
    cd service && source .venv/bin/activate
    python -m eval.run_eval [cafe_slug]   # varsayılan: cafe-go
"""
from __future__ import annotations

import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.firebase_client import fetch_menu_items, resolve_cafe_id  # noqa: E402
from app.rag import ask  # noqa: E402

EVAL_DIR = Path(__file__).resolve().parent


def main():
    cafe_slug = sys.argv[1] if len(sys.argv) > 1 else "cafe-go"
    cafe_id = resolve_cafe_id(cafe_slug)
    if cafe_id is None:
        print(f"'{cafe_slug}' slug'ına sahip kafe bulunamadı.")
        sys.exit(1)

    menu_items = fetch_menu_items(cafe_id)
    qa_set = json.loads((EVAL_DIR / "qa_set.json").read_text(encoding="utf-8"))

    results = []
    correct = 0
    for case in qa_set:
        t0 = time.time()
        response = ask(case["question"], menu_items, lang=case["lang"])
        elapsed = round(time.time() - t0, 2)

        is_correct = response["grounded"] == case["expected_grounded"]
        correct += is_correct

        results.append({
            **case,
            "actual_answer": response["answer"],
            "actual_grounded": response["grounded"],
            "correct": is_correct,
            "elapsed_s": elapsed,
        })

        status = "OK " if is_correct else "FAIL"
        print(f"[{status}] {case['id']} ({case['lang']}, {elapsed}s): {case['question']}")
        print(f"       beklenen grounded={case['expected_grounded']}, gerçek={response['grounded']}")
        print(f"       cevap: {response['answer']!r}")

    accuracy = correct / len(qa_set)
    print(f"\nGroundedness doğruluğu: {correct}/{len(qa_set)} ({accuracy:.0%})")

    out_path = EVAL_DIR / "last_run_results.json"
    out_path.write_text(
        json.dumps({"accuracy": accuracy, "results": results}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"Detaylı sonuçlar: {out_path}")


if __name__ == "__main__":
    main()

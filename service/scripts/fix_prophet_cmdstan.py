"""Prophet 1.1.5, paket icine yarim (makefile'siz) bir cmdstan-2.33.1 kopyasi
gomuyor. cmdstanpy'nin daha yeni surumleri bu dizini dogrularken makefile
bulamayip hata veriyor ve butun stan backend'leri sessizce basarisiz oluyor
(AttributeError: 'Prophet' object has no attribute 'stan_backend').

Bu script o yarim dizini devre disi birakir; Prophet o zaman sistemde
`install_cmdstan` ile kurulmus tam cmdstan kurulumunu (~/.cmdstan) kullanir.
`pip install -r requirements.txt` sonrasi bir defa calistirilmasi yeterli.
"""
import importlib.resources as importlib_resources
from pathlib import Path

CMDSTAN_VERSION = "2.33.1"


def main():
    stan_model_dir = importlib_resources.files("prophet") / "stan_model"
    broken_dir = Path(str(stan_model_dir / f"cmdstan-{CMDSTAN_VERSION}"))
    disabled_dir = broken_dir.with_name(broken_dir.name + ".disabled")

    if disabled_dir.exists():
        print(f"Zaten devre disi: {disabled_dir}")
        return
    if not broken_dir.exists():
        print("Yarim cmdstan dizini bulunamadi, muhtemelen zaten duzeltilmis.")
        return

    broken_dir.rename(disabled_dir)
    print(f"Devre disi birakildi: {broken_dir} -> {disabled_dir}")


if __name__ == "__main__":
    main()

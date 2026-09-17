from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd
from prophet import Prophet

MIN_HISTORY_DAYS = 14
DEFAULT_TEST_DAYS = 7
DEFAULT_HORIZON_DAYS = 7


@dataclass
class ForecastResult:
    dates: list
    baseline: list
    prophet: list
    baseline_mae: float | None = None
    prophet_mae: float | None = None
    baseline_rmse: float | None = None
    prophet_rmse: float | None = None
    history_days: int = 0
    insufficient_data: bool = False
    note: str = ""


def _daily_series(df: pd.DataFrame, value_col: str) -> pd.Series:
    """Sipariş kayıtlarını günlük toplam seriye indirger, veri olmayan
    günleri 0 ile doldurur (talep yoksa gerçek değer 0'dır, eksik veri değil)."""
    daily = (
        df.set_index("created_at")[value_col]
        .resample("D")
        .sum()
    )
    return daily


def _baseline_predict(train: pd.Series, target_dates: pd.DatetimeIndex) -> np.ndarray:
    """Basit taban çizgisi: haftanın günü ortalaması (day-of-week average)."""
    by_weekday = train.groupby(train.index.dayofweek).mean()
    overall_mean = train.mean()
    return np.array(
        [by_weekday.get(d.dayofweek, overall_mean) for d in target_dates]
    )


def _prophet_predict(train: pd.Series, target_dates: pd.DatetimeIndex) -> np.ndarray:
    train_df = train.reset_index()
    train_df.columns = ["ds", "y"]
    model = Prophet(
        daily_seasonality=False,
        weekly_seasonality=True,
        yearly_seasonality=False,
        interval_width=0.8,
    )
    model.fit(train_df)
    future = pd.DataFrame({"ds": target_dates})
    forecast = model.predict(future)
    return forecast["yhat"].clip(lower=0).to_numpy()


def _mae(actual: np.ndarray, predicted: np.ndarray) -> float:
    return float(np.mean(np.abs(actual - predicted)))


def _rmse(actual: np.ndarray, predicted: np.ndarray) -> float:
    return float(np.sqrt(np.mean((actual - predicted) ** 2)))


def run_forecast(
    df: pd.DataFrame,
    value_col: str = "item_count",
    test_days: int = DEFAULT_TEST_DAYS,
    horizon_days: int = DEFAULT_HORIZON_DAYS,
) -> ForecastResult:
    if df.empty:
        return ForecastResult(
            dates=[], baseline=[], prophet=[], history_days=0,
            insufficient_data=True,
            note="Henüz hiç sipariş verisi yok.",
        )

    daily = _daily_series(df, value_col)
    history_days = len(daily)

    if history_days < MIN_HISTORY_DAYS:
        return ForecastResult(
            dates=[], baseline=[], prophet=[], history_days=history_days,
            insufficient_data=True,
            note=(
                f"Anlamlı bir karşılaştırma için en az {MIN_HISTORY_DAYS} günlük "
                f"sipariş geçmişi gerekiyor (şu an {history_days} gün var). "
                "Prophet'in mevsimsellik varsayımları kısa geçmişte güvenilir değildir."
            ),
        )

    effective_test_days = min(test_days, max(3, history_days // 5))
    train = daily.iloc[: -effective_test_days]
    test = daily.iloc[-effective_test_days:]

    baseline_test_pred = _baseline_predict(train, test.index)
    prophet_test_pred = _prophet_predict(train, test.index)

    baseline_mae = _mae(test.to_numpy(), baseline_test_pred)
    prophet_mae = _mae(test.to_numpy(), prophet_test_pred)
    baseline_rmse = _rmse(test.to_numpy(), baseline_test_pred)
    prophet_rmse = _rmse(test.to_numpy(), prophet_test_pred)

    future_dates = pd.date_range(
        start=daily.index[-1] + pd.Timedelta(days=1), periods=horizon_days, freq="D"
    )
    baseline_future = _baseline_predict(daily, future_dates)
    prophet_future = _prophet_predict(daily, future_dates)

    better = "Prophet" if prophet_mae < baseline_mae else "Baseline (haftanın günü ortalaması)"
    note = (
        f"Son {effective_test_days} günlük test penceresinde {better} daha düşük "
        f"MAE verdi (baseline={baseline_mae:.2f}, prophet={prophet_mae:.2f})."
    )

    return ForecastResult(
        dates=[d.strftime("%Y-%m-%d") for d in future_dates],
        baseline=[round(float(v), 2) for v in baseline_future],
        prophet=[round(float(v), 2) for v in prophet_future],
        baseline_mae=round(baseline_mae, 3),
        prophet_mae=round(prophet_mae, 3),
        baseline_rmse=round(baseline_rmse, 3),
        prophet_rmse=round(prophet_rmse, 3),
        history_days=history_days,
        insufficient_data=False,
        note=note,
    )

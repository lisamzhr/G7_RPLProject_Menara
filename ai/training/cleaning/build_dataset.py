import numpy as np, pandas as pd
from pathlib import Path

IN = Path("ai/data/datasets/processed/vase_clean.csv")
OUT = Path("ai/data/datasets/processed/vase_features.csv")
THRESH = 0.20      # ambang "kering" (skala 0-1)
STEP_H = 1 / 6     # 10 menit = 1/6 jam
WET_JUMP = 0.10    # kenaikan dalam 1 jam dianggap penyiraman
MAX_H = 72         # horizon prediksi maksimum (jam)
MIN_ROWS = 100     # episode dengan baris lebih sedikit dibuang

def add_features(g):
    g = g.sort_values("ts").reset_index(drop=True)
    m = g.moisture.values
    g["rate_1h"] = g.moisture.diff(6) / 1.0            # per jam
    g["rate_3h"] = g.moisture.diff(18) / 3.0
    g["h_sin"] = np.sin(2*np.pi*g.ts.dt.hour/24)
    g["h_cos"] = np.cos(2*np.pi*g.ts.dt.hour/24)
    wet = (g.moisture.diff(6) > WET_JUMP).values       # event penyiraman
    y = np.full(len(g), np.nan)
    for i in range(len(g)-1, -1, -1):                  # label dihitung mundur
        if m[i] < THRESH: y[i] = 0.0
        elif i+1 < len(g) and not wet[i+1] and not np.isnan(y[i+1]): y[i] = y[i+1] + STEP_H
    g["hours_to_dry"] = y
    g["episode"] = g.dataset + "/" + g.sensor
    return g

def main():
    df = pd.read_csv(IN, parse_dates=["ts"])
    out = pd.concat([add_features(g) for _, g in df.groupby(["dataset", "sensor"])])
    out = out.dropna(subset=["rate_3h", "hours_to_dry"])
    out = out[(out.hours_to_dry > 0) & (out.hours_to_dry <= MAX_H)]
    out = out.groupby("episode").filter(lambda e: len(e) >= MIN_ROWS)
    out.to_csv(OUT, index=False)
    print(out.groupby("episode").agg(rows=("moisture", "size"), max_h=("hours_to_dry", "max")))

if __name__ == "__main__":
    main()
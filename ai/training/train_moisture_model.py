import numpy as np, pandas as pd, joblib
from pathlib import Path
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error

IN = Path("ai/data/datasets/processed/vase_clean.csv")
OUT = Path("ai/models/moisture_model.pkl")
THRESHOLDS = range(10, 85, 5)   # ambang "kering" yang disimulasikan (% kelembapan)
STEP_H, WET_JUMP, MAX_H = 1 / 6, 10.0, 72
MIN_RATE = 0.05                 # %/jam; laju turun lebih landai dianggap "tidak mengering"
FEATS = ["margin", "rate_1h", "rate_3h", "lin_est", "h_sin", "h_cos"]

def episode_rows(g):
    g = g.sort_values("ts").reset_index(drop=True)
    pct = g.moisture.values * 100                       # skala 0-1 -> persen
    g["pct"] = pct
    g["rate_1h"] = g.pct.diff(6)                        # %/jam
    g["rate_3h"] = g.pct.diff(18) / 3
    g["h_sin"] = np.sin(2*np.pi*g.ts.dt.hour/24)
    g["h_cos"] = np.cos(2*np.pi*g.ts.dt.hour/24)
    wet = (g.pct.diff(6) > WET_JUMP).values
    out = []
    for L in THRESHOLDS:
        y = np.full(len(g), np.nan)
        for i in range(len(g)-1, -1, -1):               # label mundur, putus di penyiraman
            if pct[i] < L: y[i] = 0.0
            elif i+1 < len(g) and not wet[i+1] and not np.isnan(y[i+1]): y[i] = y[i+1] + STEP_H
        d = g.copy()
        d["margin"], d["hours"] = pct - L, y
        out.append(d)
    d = pd.concat(out)
    d["lin_est"] = (d.margin / (-d.rate_3h).clip(lower=MIN_RATE)).clip(0, MAX_H)
    d = d.dropna(subset=FEATS + ["hours"])
    d = d[(d.hours > 0) & (d.hours <= MAX_H) & (d.rate_3h < -MIN_RATE)]   # hanya saat mengering
    d["episode"] = g.dataset.iloc[0] + "/" + g.sensor.iloc[0]
    return d

def make_model():
    return RandomForestRegressor(n_estimators=200, max_depth=8, min_samples_leaf=10,
                                 random_state=42, n_jobs=-1)

def main():
    raw = pd.read_csv(IN, parse_dates=["ts"])
    df = pd.concat([episode_rows(g) for _, g in raw.groupby(["dataset", "sensor"])])
    df = df.groupby("episode").filter(lambda e: len(e) >= 200)
    print(df.groupby("episode").size().rename("baris").to_string(), "\n")
    rows = []
    for ep in df.episode.unique():
        tr, te = df[df.episode != ep], df[df.episode == ep]
        m = make_model().fit(tr[FEATS], tr.hours)
        rows.append({"uji_di": ep, "n": len(te),
                     "MAE_ML": mean_absolute_error(te.hours, m.predict(te[FEATS])),
                     "MAE_linear": mean_absolute_error(te.hours, te.lin_est),
                     "MAE_rata2": mean_absolute_error(te.hours, np.full(len(te), tr.hours.mean()))})
    print(pd.DataFrame(rows).round(2).to_string(index=False))
    final = make_model().fit(df[FEATS], df.hours)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump({"model": final, "features": FEATS, "max_h": MAX_H, "min_rate": MIN_RATE}, OUT)
    print("tersimpan:", OUT)

if __name__ == "__main__":
    main()
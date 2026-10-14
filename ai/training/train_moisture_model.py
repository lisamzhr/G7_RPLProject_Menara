import numpy as np, pandas as pd, joblib
from pathlib import Path
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error

IN = Path("ai/data/datasets/processed/vase_features.csv")
OUT = Path("ai/models/moisture_model.pkl")
THRESH, MAX_H = 0.20, 72
FEATS = ["moisture", "rate_1h", "rate_3h", "h_sin", "h_cos"]

def baseline(df):
    """Tebakan linear: (sisa kelembapan) / (laju turun)"""
    rate = (-df.rate_3h).clip(lower=0.002)
    return ((df.moisture - THRESH) / rate).clip(0, MAX_H)

def make_model():
    return RandomForestRegressor(n_estimators=200, max_depth=6, min_samples_leaf=5,
                                 random_state=42, n_jobs=-1)

def main():
    df = pd.read_csv(IN)
    # evaluasi leave-one-episode-out: latih di episode lain, uji di episode ini
    rows = []
    for ep in df.episode.unique():
        tr, te = df[df.episode != ep], df[df.episode == ep]
        m = make_model().fit(tr[FEATS], tr.hours_to_dry)
        rows.append({"uji_di": ep, "n": len(te),
                     "MAE_ML_jam": mean_absolute_error(te.hours_to_dry, m.predict(te[FEATS])),
                     "MAE_baseline_jam": mean_absolute_error(te.hours_to_dry, baseline(te)),
                     "MAE_rata2_jam": mean_absolute_error(te.hours_to_dry, np.full(len(te), tr.hours_to_dry.mean()))})
    print(pd.DataFrame(rows).round(2).to_string(index=False))
    # model akhir: latih di semua episode
    final = make_model().fit(df[FEATS], df.hours_to_dry)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump({"model": final, "features": FEATS, "thresh": THRESH, "max_h": MAX_H}, OUT)
    print("tersimpan:", OUT)

if __name__ == "__main__":
    main()
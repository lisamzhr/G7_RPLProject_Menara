import numpy as np, pandas as pd, joblib
from pathlib import Path
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, f1_score, confusion_matrix
from sklearn.model_selection import GroupKFold

IN = Path("ai/data/datasets/processed/health_clean.csv")
OUT = Path("ai/models/health_model.pkl")
FEATS = ["soil_moisture", "air_temp", "soil_temp", "rh", "lux"]
NAMES = ["Healthy", "Moderate", "High Stress"]

def make_model():
    return RandomForestClassifier(n_estimators=300, max_depth=8, min_samples_leaf=5,
                                  class_weight="balanced", random_state=42, n_jobs=-1)

def main():
    df = pd.read_csv(IN)
    X, y, g = df[FEATS], df.label, df.Plant_ID
    pred = np.zeros(len(df), dtype=int)
    for tr, te in GroupKFold(5).split(X, y, g):   # uji pada tanaman yang belum pernah dilihat
        pred[te] = make_model().fit(X.iloc[tr], y.iloc[tr]).predict(X.iloc[te])
    print(f"akurasi: {accuracy_score(y, pred):.3f} | macro-F1: {f1_score(y, pred, average='macro'):.3f}"
          f" | baseline (tebak kelas terbanyak): {y.value_counts(normalize=True).max():.3f}")
    print(pd.DataFrame(confusion_matrix(y, pred), index=NAMES, columns=NAMES))
    final = make_model().fit(X, y)
    print(dict(zip(FEATS, final.feature_importances_.round(2))))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump({"model": final, "features": FEATS, "labels": NAMES}, OUT)
    print("tersimpan:", OUT)

if __name__ == "__main__":
    main()
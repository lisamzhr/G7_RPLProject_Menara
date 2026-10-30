import pandas as pd
from pathlib import Path

RAW = Path("ai/data/datasets/raw")
OUT = Path("ai/data/datasets/processed/vase_clean.csv")
FILES = {"vase1": "plant_vase1_2_.csv", "vase2": "plant_vase2.CSV"}
SENSORS = ["moisture0", "moisture1", "moisture2", "moisture3"]  # moisture4 dibuang: flat ~0.02 (sensor mati)

def load(name, fname):
    df = pd.read_csv(RAW / fname)
    df["ts"] = pd.to_datetime(df[["year", "month", "day", "hour", "minute", "second"]])
    df = df.drop_duplicates("ts").sort_values("ts").set_index("ts")[SENSORS]
    df = df.rolling(5, center=True, min_periods=1).median()   # buang spike sesaat
    df = df.resample("10min").mean().interpolate(limit=3)     # interval seragam
    out = df.reset_index().melt("ts", var_name="sensor", value_name="moisture").dropna()
    out.insert(0, "dataset", name)
    return out

def main():
    clean = pd.concat([load(n, f) for n, f in FILES.items()])
    clean = clean[clean.moisture.between(0, 1)].sort_values(["dataset", "sensor", "ts"])
    OUT.parent.mkdir(parents=True, exist_ok=True)
    clean.to_csv(OUT, index=False)
    print(clean.groupby(["dataset", "sensor"]).moisture.agg(["count", "min", "max"]))

if __name__ == "__main__":
    main()
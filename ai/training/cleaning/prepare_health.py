import pandas as pd
from pathlib import Path

IN = Path("ai/data/datasets/raw/plant_health_data.csv")
OUT = Path("ai/data/datasets/processed/health_clean.csv")
# hanya fitur yang benar-benar ada di sensor MENARA (ESP32 + DHT22 + soil moisture + BH1750)
RENAME = {"Soil_Moisture": "soil_moisture", "Ambient_Temperature": "air_temp",
          "Soil_Temperature": "soil_temp", "Humidity": "rh", "Light_Intensity": "lux"}
LABELS = {"Healthy": 0, "Moderate Stress": 1, "High Stress": 2}

def main():
    df = pd.read_csv(IN, parse_dates=["Timestamp"])
    n0 = len(df)
    df = df.drop_duplicates(["Timestamp", "Plant_ID"]).dropna()
    df = df.rename(columns=RENAME)
    df = df[df.soil_moisture.between(0, 100) & df.rh.between(0, 100)]
    df["label"] = df.Plant_Health_Status.map(LABELS)
    df = df.dropna(subset=["label"]).astype({"label": int})
    out = df[["Timestamp", "Plant_ID", *RENAME.values(), "label"]].sort_values(["Plant_ID", "Timestamp"])
    OUT.parent.mkdir(parents=True, exist_ok=True)
    out.to_csv(OUT, index=False)
    print(f"{n0} -> {len(out)} baris")
    print(out.label.value_counts().sort_index().rename({0: "Healthy", 1: "Moderate", 2: "High Stress"}))
    print(out[list(RENAME.values())].describe().loc[["min", "max"]].round(1))

if __name__ == "__main__":
    main()
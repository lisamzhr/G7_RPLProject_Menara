import joblib, numpy as np, pandas as pd

MOIST = joblib.load("ai/models/moisture_model.pkl")
HEALTH = joblib.load("ai/models/health_model.pkl")

def hours_to_dry(moisture, rate_1h, rate_3h, hour):
    """moisture skala 0-1, rate dalam satuan per jam (negatif = mengering)."""
    x = pd.DataFrame([{"moisture": moisture, "rate_1h": rate_1h, "rate_3h": rate_3h,
                       "h_sin": np.sin(2*np.pi*hour/24), "h_cos": np.cos(2*np.pi*hour/24)}])[MOIST["features"]]
    ml = float(MOIST["model"].predict(x)[0])
    lin = float(np.clip((moisture - MOIST["thresh"]) / max(-rate_3h, 0.002), 0, MOIST["max_h"]))
    return ml, lin

def plant_health(soil_moisture, air_temp, soil_temp, rh, lux):
    """soil_moisture dalam persen (10-40)."""
    x = pd.DataFrame([dict(soil_moisture=soil_moisture, air_temp=air_temp,
                           soil_temp=soil_temp, rh=rh, lux=lux)])[HEALTH["features"]]
    p = HEALTH["model"].predict_proba(x)[0]
    return HEALTH["labels"][int(p.argmax())], dict(zip(HEALTH["labels"], p.round(2).tolist()))

if __name__ == "__main__":
    print("== Dry-down (ML vs linear) ==")
    for m, r, h in [(0.60, -0.010, 8), (0.40, -0.008, 14), (0.25, -0.005, 20), (0.60, 0.0, 12)]:
        ml, lin = hours_to_dry(m, r, r, h)
        print(f"moisture={m:.2f} laju={r:+.3f}/jam jam={h:02d} -> ML {ml:5.1f} jam | linear {lin:5.1f} jam")
    print("\n== Health ==")
    for s in [(35, 26, 22, 55, 600), (25, 28, 23, 50, 800), (15, 29, 24, 45, 900)]:
        print(s, "->", *plant_health(*s))
import joblib

from roofgarden_ai.rule_engine.predictor import MODEL_PATH

print("MODEL_PATH:", MODEL_PATH, "exists:", MODEL_PATH.exists())
b = joblib.load(MODEL_PATH)
print(type(b["model"]), b["features"], b["max_h"], b["min_rate"])
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd
from joblib import dump
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler


ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = ROOT / "ml" / "artifacts"
MODEL_PATH = ARTIFACTS / "risk_model.joblib"
METRICS_PATH = ARTIFACTS / "risk_model_metrics.json"


def build_dataset(n: int = 4000, seed: int = 226) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    types = rng.choice(["DEPOT", "RETRAIT", "VIREMENT"], size=n, p=[0.45, 0.35, 0.20])
    montant = rng.lognormal(mean=12.3, sigma=1.1, size=n).clip(2_000, 25_000_000)
    solde = rng.lognormal(mean=13.0, sigma=1.0, size=n).clip(0, 50_000_000)
    nb_ops_24h = rng.poisson(lam=1.6, size=n)
    nb_ops_30j = rng.poisson(lam=8.0, size=n)
    montant_moyen_30j = rng.lognormal(mean=11.8, sigma=0.9, size=n).clip(1_000, 8_000_000)
    a_mandat = rng.choice([0, 1], size=n, p=[0.88, 0.12])
    client_ppe = rng.choice([0, 1], size=n, p=[0.93, 0.07])
    piece_expiree = rng.choice([0, 1], size=n, p=[0.96, 0.04])
    score_client = rng.normal(loc=38, scale=18, size=n).clip(0, 100)

    labels = []
    for row in zip(types, montant, solde, nb_ops_24h, nb_ops_30j, montant_moyen_30j, a_mandat, client_ppe, piece_expiree, score_client):
        type_op, mnt, sld, ops_24h, ops_30j, avg_30j, mandat, ppe, expired, score = row
        if expired or mnt >= 10_000_000 or (type_op == "VIREMENT" and ppe and mnt >= 2_000_000):
            labels.append("BLOQUANTE")
        elif (
            mnt >= 5_000_000
            or (ops_24h >= 3 and mnt < 1_000_000)
            or mnt > avg_30j * 5
            or score >= 70
            or (mandat and mnt >= 500_000)
            or ops_30j >= 20
        ):
            labels.append("SUSPECTE")
        else:
            labels.append("NORMAL")

    return pd.DataFrame(
        {
            "type_operation": types,
            "montant": montant.round(2),
            "solde_compte": solde.round(2),
            "nb_ops_24h": nb_ops_24h,
            "nb_ops_30j": nb_ops_30j,
            "montant_moyen_30j": montant_moyen_30j.round(2),
            "a_mandat": a_mandat,
            "client_ppe": client_ppe,
            "piece_expiree": piece_expiree,
            "score_risque_client": score_client.round(2),
            "label": labels,
        }
    )


def train() -> None:
    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    df = build_dataset()
    features = [c for c in df.columns if c != "label"]
    x_train, x_test, y_train, y_test = train_test_split(
        df[features], df["label"], test_size=0.25, random_state=226, stratify=df["label"]
    )

    numeric_features = [
        "montant",
        "solde_compte",
        "nb_ops_24h",
        "nb_ops_30j",
        "montant_moyen_30j",
        "a_mandat",
        "client_ppe",
        "piece_expiree",
        "score_risque_client",
    ]
    categorical_features = ["type_operation"]

    pipeline = Pipeline(
        steps=[
            (
                "preprocessing",
                ColumnTransformer(
                    transformers=[
                        ("numeric", StandardScaler(), numeric_features),
                        ("categorical", OneHotEncoder(handle_unknown="ignore"), categorical_features),
                    ]
                ),
            ),
            (
                "classifier",
                RandomForestClassifier(
                    n_estimators=120,
                    max_depth=9,
                    min_samples_leaf=4,
                    random_state=226,
                    class_weight="balanced",
                ),
            ),
        ]
    )
    pipeline.fit(x_train, y_train)

    predictions = pipeline.predict(x_test)
    metrics = {
        "accuracy": accuracy_score(y_test, predictions),
        "classification_report": classification_report(y_test, predictions, output_dict=True),
        "features": features,
        "classes": sorted(df["label"].unique()),
        "dataset": "synthetique, regles inspirees du TDR CIF Thematique 01",
    }
    dump({"pipeline": pipeline, "features": features, "metrics": metrics}, MODEL_PATH)
    METRICS_PATH.write_text(json.dumps(metrics, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Modele entraine: {MODEL_PATH}")
    print(f"Accuracy test: {metrics['accuracy']:.3f}")


if __name__ == "__main__":
    train()

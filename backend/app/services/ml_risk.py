from __future__ import annotations

from functools import lru_cache
from pathlib import Path

import pandas as pd
from joblib import load

from app.schemas.ml import RiskScoreRequest


ROOT = Path(__file__).resolve().parents[3]
MODEL_PATH = ROOT / "ml" / "artifacts" / "risk_model.joblib"
MODEL_VERSION = "risk-rf-synthetique-2026-09-07"


@lru_cache(maxsize=1)
def load_risk_model() -> dict:
    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Modele absent: {MODEL_PATH}. Lancez `python ml/train_risk_model.py`."
        )
    return load(MODEL_PATH)


def explain_risk(payload: RiskScoreRequest) -> list[str]:
    reasons: list[str] = []
    if payload.piece_expiree:
        reasons.append("piece d'identite expiree")
    if payload.montant >= 10_000_000:
        reasons.append("montant superieur au seuil de blocage")
    elif payload.montant >= 5_000_000:
        reasons.append("montant superieur au seuil de declaration")
    if payload.nb_ops_24h >= 3 and payload.montant < 1_000_000:
        reasons.append("fractionnement possible sur 24h")
    if payload.montant_moyen_30j > 0 and payload.montant > payload.montant_moyen_30j * 5:
        reasons.append("montant inhabituel par rapport a l'historique")
    if payload.client_ppe:
        reasons.append("client politiquement expose")
    if payload.a_mandat:
        reasons.append("operation par mandat/procuration")
    if payload.score_risque_client >= 70:
        reasons.append("score client eleve")
    return reasons or ["aucun facteur fort isole, prediction issue de la combinaison des variables"]


def predict_transaction_risk(payload: RiskScoreRequest) -> dict:
    artifact = load_risk_model()
    pipeline = artifact["pipeline"]
    features = artifact["features"]
    row = pd.DataFrame(
        [
            {
                "type_operation": payload.type_operation.value,
                "montant": payload.montant,
                "solde_compte": payload.solde_compte,
                "nb_ops_24h": payload.nb_ops_24h,
                "nb_ops_30j": payload.nb_ops_30j,
                "montant_moyen_30j": payload.montant_moyen_30j,
                "a_mandat": int(payload.a_mandat),
                "client_ppe": int(payload.client_ppe),
                "piece_expiree": int(payload.piece_expiree),
                "score_risque_client": payload.score_risque_client,
            }
        ],
        columns=features,
    )
    prediction = str(pipeline.predict(row)[0])
    probabilities = pipeline.predict_proba(row)[0]
    classes = pipeline.classes_
    return {
        "prediction": prediction,
        "probabilites": {str(label): round(float(probability), 4) for label, probability in zip(classes, probabilities)},
        "model_version": MODEL_VERSION,
        "explication": explain_risk(payload),
    }

# ============================================================
#  schemas/mlp.py — Schémas Pydantic pour le module MLP
# ============================================================

from pydantic import BaseModel, Field
from typing import List


class Transaction(BaseModel):
    amt:            float = Field(..., example=250.0)
    hour:           int   = Field(..., example=14)
    day_of_week:    int   = Field(..., example=2)
    month:          int   = Field(..., example=6)
    is_night:       int   = Field(..., example=0)
    age:            int   = Field(..., example=35)
    distance_km:    float = Field(..., example=12.5)
    gender:         int   = Field(..., example=0)
    city_pop:       int   = Field(..., example=50000)
    category:       str   = Field(..., example="grocery_pos")
    state:          float = Field(..., example=0.012)
    job:            float = Field(..., example=0.008)
    merchant:       float = Field(..., example=0.005)
    avg_amt_card:   float = Field(..., example=180.0)
    amt_deviation:  float = Field(..., example=70.0)
    tx_count_card:  int   = Field(..., example=45)


class BatchRequest(BaseModel):
    transactions: List[Transaction]

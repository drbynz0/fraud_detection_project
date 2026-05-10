# ============================================================
#  schemas/bsm.py — Schémas Pydantic pour BSM + Chatbot
# ============================================================

from pydantic import BaseModel, Field
from typing import List, Optional


class SessionData(BaseModel):
    typing_speed_ms:             float = Field(..., example=180.0)
    typing_regularity:           float = Field(..., example=0.85)
    copy_paste_detected:         int   = Field(..., example=0)
    mouse_movement_entropy:      float = Field(..., example=0.78)
    time_on_page_sec:            float = Field(..., example=45.0)
    field_focus_changes:         int   = Field(..., example=5)
    form_fill_duration_ms:       float = Field(..., example=12000.0)
    tab_switches:                int   = Field(..., example=1)
    scroll_events:               int   = Field(..., example=8)
    is_new_device:               int   = Field(..., example=0)
    device_fingerprint_match:    int   = Field(..., example=1)
    ip_country_match:            int   = Field(..., example=1)
    ip_is_vpn_proxy:             int   = Field(..., example=0)
    time_since_last_login_min:   float = Field(..., example=120.0)
    login_failed_attempts:       int   = Field(..., example=0)
    session_age_sec:             float = Field(..., example=300.0)
    is_mobile_desktop_mismatch:  int   = Field(..., example=0)
    is_new_beneficiary:          int   = Field(..., example=0)
    amt_vs_avg_ratio:            float = Field(..., example=1.0)
    transactions_last_hour:      int   = Field(..., example=1)
    is_international:            int   = Field(..., example=0)
    hour_of_day:                 int   = Field(..., example=14)
    is_weekend:                  int   = Field(..., example=0)


class ChatMessage(BaseModel):
    message:    str
    history:    Optional[List[dict]] = []
    session_id: Optional[str]        = "default"

# ============================================================
#  app.py — Point d'entrée FraudShield API v3
#  Instanciation FastAPI + CORS + montage des routers
# ============================================================

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import system, mlp, bsm, chat

app = FastAPI(
    title="FraudShield API v3 — Bank of Africa",
    description="API bicouche : MLP (détection transaction) + BSM XGBoost (scoring session sans OTP).",
    version="3.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Montage des routers ───────────────────────────────────────
app.include_router(system.router)
app.include_router(mlp.router)
app.include_router(bsm.router)
app.include_router(chat.router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)

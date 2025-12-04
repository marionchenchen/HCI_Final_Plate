from fastapi import FastAPI

from .db import Base, engine
from .routers import foods

# 在啟動時建立資料表（開發用，正式可改 Alembic migration）
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="HCI Leftover Demo API",
    description="剩食預約平台 Demo 後端",
)


@app.get("/")
def read_root():
    return {"message": "Leftover demo backend is running"}


# 掛上 /foods router
app.include_router(foods.router)

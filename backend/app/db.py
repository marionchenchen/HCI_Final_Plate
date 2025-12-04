from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # 對應到環境變數 DATABASE_URL（自動從 env 讀）
    database_url: str

    class Config:
        env_prefix = ""  # field 名稱 database_url 對應 DATABASE_URL


settings = Settings()


class Base(DeclarativeBase):
    pass


engine = create_engine(settings.database_url, echo=False)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

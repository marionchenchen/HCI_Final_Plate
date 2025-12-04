from sqlalchemy import Column, Integer, String
from .db import Base


class Food(Base):
    __tablename__ = "foods"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)             # 食物名稱
    total_quantity = Column(Integer, nullable=False)   # 原始總份數
    reserved_quantity = Column(Integer, nullable=False, default=0)  # 已預約份數

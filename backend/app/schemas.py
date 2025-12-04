from pydantic import BaseModel, ConfigDict


class FoodBase(BaseModel):
    title: str
    total_quantity: int


class FoodCreate(FoodBase):
    pass


class Food(FoodBase):
    id: int
    reserved_quantity: int

    # Pydantic v2 寫法：從 ORM 模型轉換
    model_config = ConfigDict(from_attributes=True)

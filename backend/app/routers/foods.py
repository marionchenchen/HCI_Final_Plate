from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import get_db
from .. import models, schemas

router = APIRouter(
    prefix="/foods",
    tags=["foods"],
)


@router.post("/", response_model=schemas.Food)
def create_food(food_in: schemas.FoodCreate, db: Session = Depends(get_db)):
    """Provider 發佈剩食"""
    food = models.Food(
        title=food_in.title,
        total_quantity=food_in.total_quantity,
        reserved_quantity=0,
    )
    db.add(food)
    db.commit()
    db.refresh(food)
    return food


@router.get("/", response_model=list[schemas.Food])
def list_foods(db: Session = Depends(get_db)):
    """Receiver 查看所有剩食"""
    foods = db.query(models.Food).all()
    return foods


@router.post("/{food_id}/book", response_model=schemas.Food)
def book_food(
    food_id: int,
    amount: int = 1,  # demo: 用 query 參數表示要預約幾份
    db: Session = Depends(get_db),
):
    """Receiver 預約剩食"""
    food = db.get(models.Food, food_id)
    if not food:
        raise HTTPException(status_code=404, detail="Food not found")

    # 檢查是否超訂
    if food.reserved_quantity + amount > food.total_quantity:
        raise HTTPException(status_code=400, detail="Not enough remaining")

    food.reserved_quantity += amount
    db.commit()
    db.refresh(food)
    return food

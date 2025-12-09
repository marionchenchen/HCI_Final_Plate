from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import get_db
from .. import models, schemas

router = APIRouter(
    prefix="/reservations",
    tags=["reservations"],
)

# -------------------------
# 2-1: 預約剩食
# -------------------------
@router.post("/", response_model=schemas.Reservation)
def create_reservation(reservation_in: schemas.ReservationCreate, db: Session = Depends(get_db)):
    """預約剩食 - 加入資料庫，扣除線上顯示數量"""

    # Check if post exists
    post = db.query(models.Post).filter(models.Post.food_id == reservation_in.food_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    # Check if item exists and has enough online quantity
    item = db.query(models.Item).filter_by(
        food_id=reservation_in.food_id,
        id=reservation_in.item_id
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    if item.number_online < reservation_in.number_book:
        raise HTTPException(status_code=400, detail="Not enough items available online")

    # Deduct online quantity
    item.number_online -= reservation_in.number_book

    # Create reservation record (one item per reservation)
    new_reservation = models.Reservation(
        user_id=reservation_in.user_id,
        food_id=reservation_in.food_id,
        item_id=reservation_in.item_id,
        number_book=reservation_in.number_book
    )
    db.add(new_reservation)
    db.commit()
    db.refresh(new_reservation)

    return new_reservation

# -------------------------
# 2-1-2: 修改預約
# -------------------------
@router.patch("/{reservation_id}/modify", response_model=schemas.Reservation)
def modify_reservation(reservation_id: int, modify_in: schemas.ReservationModify, db: Session = Depends(get_db)):
    """
    調整已存在的 reservation.number_book。
    """
    # 找預約
    reservation = db.query(models.Reservation).filter(models.Reservation.reservation_id == reservation_id).first()
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")

    # 找對應 item
    item = db.query(models.Item).filter(models.Item.id == reservation.item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    delta = modify_in.modify
    if delta == 0:
        return reservation

    new_number_book = reservation.number_book + delta
    if new_number_book < 1:
        raise HTTPException(status_code=400, detail="Resulting reservation quantity must be at least 1")

    # 處理增加預約（需扣 item.number_online）
    if delta > 0:
        if item.number_online < delta:
            raise HTTPException(status_code=400, detail="Not enough items available online")
        item.number_online -= delta
    else:
        # delta < 0：回補 item.number_online
        item.number_online += (-delta)

    reservation.number_book = new_number_book

    db.commit()
    db.refresh(reservation)

    return reservation

# -------------------------
# 2-1-3: 查看預約列表
# -------------------------
@router.get("/food/{food_id}", response_model=list[schemas.Reservation])
def list_reservations_by_food(food_id: int, db: Session = Depends(get_db)):
    """查找並列出相同 food_id 的所有預約"""

    # Check if post exists
    post = db.query(models.Post).filter(models.Post.food_id == food_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    # Get all reservations for this food
    reservations = db.query(models.Reservation).filter(
        models.Reservation.food_id == food_id
    ).all()

    return reservations


@router.get("/user/{user_id}", response_model=list[schemas.Reservation])
def list_reservations_by_user(user_id: int, db: Session = Depends(get_db)):
    """查找並列出某使用者的所有預約"""

    # Check if user exists
    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get all reservations for this user
    reservations = db.query(models.Reservation).filter(
        models.Reservation.user_id == user_id
    ).all()

    return reservations


# -------------------------
# 2-1-4: 刪除預約 (寫在pickup.py的 pickup fail)
# -------------------------


# -------------------------
# 測試用功能:建立user (不一定用的到)
# -------------------------

# 新增：建立使用者
@router.post("/users/", response_model=schemas.User, tags=["reservations", "users"])
def create_user(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    """建立使用者（註冊）"""

    # 檢查 email 是否已存在
    existing = db.query(models.User).filter(models.User.email == user_in.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = models.User(
        email=user_in.email,
        password=user_in.password,
        name=user_in.name,
        nickname=user_in.nickname,
        profile_pic=user_in.profile_pic,
        gps_latitude=user_in.gps_latitude,
        gps_longitude=user_in.gps_longitude
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return user
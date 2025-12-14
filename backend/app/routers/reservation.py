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
@router.post("/", response_model=list[schemas.Reservation])
def create_reservation(reservation_in: schemas.ReservationCreateMultiple, db: Session = Depends(get_db)):
    """預約剩食 - 加入資料庫，扣除線上顯示數量"""


    # Check if post exists
    post = db.query(models.Post).filter(models.Post.food_id == reservation_in.food_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")


    # Group requested items by item_id and sum their quantities
    if not reservation_in.items or len(reservation_in.items) == 0:
        raise HTTPException(status_code=400, detail="No items provided for reservation")


    # Validate positive numbers and build sums
    item_quantities: dict[int, int] = {}
    for entry in reservation_in.items:
        if entry.number_book < 1:
            raise HTTPException(status_code=400, detail=f"Invalid booking quantity for item {entry.item_id}")
        item_quantities[entry.item_id] = item_quantities.get(entry.item_id, 0) + entry.number_book


    # Fetch items in one query
    requested_item_ids = list(item_quantities.keys())
    items = db.query(models.Item).filter(models.Item.food_id == reservation_in.food_id, models.Item.id.in_(requested_item_ids)).all()
    items_map = {i.id: i for i in items}


   


    # Ensure all requested items exist and have enough quantity
    for item_id, qty in item_quantities.items():
        item = items_map.get(item_id)
        if not item:
            raise HTTPException(status_code=404, detail=f"Item {item_id} not found for this food")
        if item.number_online < qty:
            raise HTTPException(status_code=400, detail=f"Not enough items available online for item {item_id}")


    # All good, deduct and create reservation rows
    new_reservations: list[models.Reservation] = []
    for item_id, qty in item_quantities.items():
        item = items_map[item_id]
        item.number_online -= qty
        res = models.Reservation(
            gps_latitude=reservation_in.gps_latitude,
            gps_longitude=reservation_in.gps_longitude,
            user_id=reservation_in.user_id,
            food_id=reservation_in.food_id,
            item_id=item_id,
            number_book=qty
        )
        db.add(res)
        new_reservations.append(res)


    db.commit()
    for r in new_reservations:
        db.refresh(r)


    # Create or check warning entry for this user & food
    warning = db.query(models.Warning).filter_by(
        user_id=reservation_in.user_id,
        food_id=reservation_in.food_id
    ).first()
   
    if not warning:
        warning = models.Warning(
            user_id=reservation_in.user_id,
            food_id=reservation_in.food_id,
            warning_times=0
        )
        db.add(warning)
        db.commit()


    return new_reservations


# -------------------------
# 2-1-2: 修改預約（多品項，依 food_id + user_id）
# -------------------------
@router.patch("/food/{food_id}/user/{user_id}/modify", response_model=list[schemas.Reservation])
def modify_reservations_bulk(food_id: int, user_id: int, modify_in: schemas.ReservationModifyMultiple, db: Session = Depends(get_db)):
    """同一筆貼文的多個預約一次調整，基於 food_id 與 user_id。

    傳入的是「新的預約數量」而非增量，會將每個 item 的 reservation.number_book 設為指定的新值，並相應調整 item.number_online。
    """

    if not modify_in.items:
        raise HTTPException(status_code=400, detail="No items provided for modification")

    # 確認貼文與使用者存在
    post = db.query(models.Post).filter(models.Post.food_id == food_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # 目標每個 item 的新數量
    target_new_amounts: dict[int, int] = {}
    for entry in modify_in.items:
        target_new_amounts[entry.item_id] = entry.new_amount

    # 抓取相關 reservations 與 items
    target_item_ids = list(target_new_amounts.keys())
    reservations = db.query(models.Reservation).filter(
        models.Reservation.food_id == food_id,
        models.Reservation.user_id == user_id,
        models.Reservation.item_id.in_(target_item_ids)
    ).all()
    reservation_map = {r.item_id: r for r in reservations}

    items = db.query(models.Item).filter(
        models.Item.food_id == food_id,
        models.Item.id.in_(target_item_ids)
    ).all()
    item_map = {i.id: i for i in items}

    # 驗證每個 item 都存在且有對應預約
    for item_id in target_item_ids:
        if item_id not in item_map:
            raise HTTPException(status_code=404, detail=f"Item {item_id} not found for this food")
        if item_id not in reservation_map:
            raise HTTPException(status_code=404, detail=f"Reservation for item {item_id} not found")

    # 先驗證所有新數量是否可行
    for item_id, new_number_book in target_new_amounts.items():
        if new_number_book < 1:
            raise HTTPException(status_code=400, detail="Resulting reservation quantity must be at least 1")
        res = reservation_map[item_id]
        item = item_map[item_id]
        delta = new_number_book - res.number_book
        if delta > 0 and item.number_online < delta:
            raise HTTPException(status_code=400, detail=f"Not enough items available online for item {item_id}")

    # 通過驗證後再一次性更新庫存與預約數
    updated_reservations: list[models.Reservation] = []
    for item_id, new_number_book in target_new_amounts.items():
        res = reservation_map[item_id]
        item = item_map[item_id]
        delta = new_number_book - res.number_book

        if delta > 0:
            item.number_online -= delta
        elif delta < 0:
            item.number_online += (-delta)

        res.number_book = new_number_book
        updated_reservations.append(res)

    db.commit()
    for r in updated_reservations:
        db.refresh(r)

    return updated_reservations

# -------------------------
# 2-1-3: 查看預約列表
# -------------------------


@router.get("/food/{food_id}", response_model=list[schemas.ReservationsByUserWithItem])
def list_reservations_by_food(food_id: int, db: Session = Depends(get_db)):
    """查找並列出相同 food_id 的所有預約，並依 user_id 分組回傳，並帶出 item 名稱。"""

    # Check if post exists
    post = db.query(models.Post).filter(models.Post.food_id == food_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    # Get all reservations for this food
    reservations = db.query(models.Reservation).filter(
        models.Reservation.food_id == food_id
    ).all()

    if not reservations:
        return []

    # Fetch related items to attach names
    item_ids = {r.item_id for r in reservations}
    items = db.query(models.Item).filter(models.Item.id.in_(item_ids)).all()
    item_map = {i.id: i for i in items}

    # Group by user_id with item names
    grouped: dict[int, list[schemas.ReservationWithItem]] = {}
    for r in reservations:
        item = item_map.get(r.item_id)
        item_name = item.item if item else ""
        enriched = schemas.ReservationWithItem(
            reservation_id=r.reservation_id,
            user_id=r.user_id,
            food_id=r.food_id,
            item_id=r.item_id,
            gps_latitude=r.gps_latitude,
            gps_longitude=r.gps_longitude,
            item_name=item_name,
            number_book=r.number_book,
            reserve_at=r.reserve_at,
        )
        grouped.setdefault(r.user_id, []).append(enriched)

    # Build response list sorted by user_id for consistency
    result: list[schemas.ReservationsByUserWithItem] = []
    for uid in sorted(grouped.keys()):
        result.append(schemas.ReservationsByUserWithItem(user_id=uid, reservations=grouped[uid]))

    return result


@router.get("/user/{user_id}", response_model=list[schemas.ReservationsByFoodWithItem])
def list_reservations_by_user(user_id: int, db: Session = Depends(get_db)):
    """查找並列出某使用者的所有預約，依 food_id 分組，並帶出 item 名稱。"""

    # Check if user exists
    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get all reservations for this user
    reservations = db.query(models.Reservation).filter(
        models.Reservation.user_id == user_id
    ).all()

    if not reservations:
        return []

    # Fetch related items to attach names
    item_ids = {r.item_id for r in reservations}
    items = db.query(models.Item).filter(models.Item.id.in_(item_ids)).all()
    item_map = {i.id: i for i in items}

    grouped: dict[int, list[schemas.ReservationWithItem]] = {}
    for r in reservations:
        item = item_map.get(r.item_id)
        item_name = item.item if item else ""
        enriched = schemas.ReservationWithItem(
            reservation_id=r.reservation_id,
            user_id=r.user_id,
            food_id=r.food_id,
            item_id=r.item_id,
            item_name=item_name,
            gps_latitude=r.gps_latitude,
            gps_longitude=r.gps_longitude,
            number_book=r.number_book,
            reserve_at=r.reserve_at,
        )
        grouped.setdefault(r.food_id, []).append(enriched)

    result: list[schemas.ReservationsByFoodWithItem] = []
    for fid in sorted(grouped.keys()):
        result.append(schemas.ReservationsByFoodWithItem(food_id=fid, reservations=grouped[fid]))

    return result


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
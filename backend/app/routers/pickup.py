from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import get_db
from .. import models, schemas

router = APIRouter(
    prefix="/pickup",
    tags=["pickup"],
)

# -------------------------
# Pickup Success (領取成功)
# -------------------------
@router.post("/pickup/success", response_model=schemas.PickupSuccess)
def pickup_success(data: schemas.PickupSuccess, db: Session = Depends(get_db)):

    # find reservations
    reservations = db.query(models.Reservation).filter_by(
        user_id=data.user_id,
        food_id=data.food_id
    ).all()

    if not reservations:
        raise HTTPException(404, "No reservation found")

    # 1. Deduct onsite quantity for each reservation
    for r in reservations:
        item_row = db.query(models.Item).filter_by(
            food_id=data.food_id,
            item=r.item
        ).first()

        if item_row:
            item_row.number_onsite -= r.number_book

            # auto delete item if onsite <= 0
            if item_row.number_onsite <= 0:
                db.delete(item_row)

    # 2. Delete all reservations for this user & food
    db.query(models.Reservation).filter_by(
        user_id=data.user_id,
        food_id=data.food_id
    ).delete()

    # 3. If user left a comment → store it
    if data.comment and data.comment.strip() != "":
        new_comment = models.Comment(
            user_id=data.user_id,
            food_id=data.food_id,
            comment=data.comment
        )
        db.add(new_comment)

    db.commit()

    # 4. If all items are gone → delete the whole post
    count = db.query(models.Item).filter_by(food_id=data.food_id).count()

    if count == 0:
        post = db.query(models.Post).filter_by(food_id=data.food_id).first()
        if post:
            db.delete(post)
            db.commit()
        return {"message": "Pickup success, post removed because all items are gone"}

    return {"message": "Pickup success"}



# -------------------------
# Pickup Failed (領取失敗)
# -------------------------
@router.post("/pickup/fail", response_model=schemas.PickupFail)
def pickup_fail(data: schemas.PickupFail, db: Session = Depends(get_db)):

    # find reservations
    reservations = db.query(models.Reservation).filter_by(
        user_id=data.user_id,
        food_id=data.food_id
    ).all()

    if not reservations:
        raise HTTPException(404, "No reservation found")

    # 1. Add back number_online
    for r in reservations:
        item_row = db.query(models.Item).filter_by(
            food_id=data.food_id,
            item=r.item
        ).first()

        if item_row:
            item_row.number_online += r.number_book

    # 2. Delete reservations
    db.query(models.Reservation).filter_by(
        user_id=data.user_id,
        food_id=data.food_id
    ).delete()

    # 3. Add warning
    item_row = db.query(models.Warning).filter_by(
        user_id=data.user_id,
        food_id=data.food_id
    ).first()

    if item_row:
        item_row.warning_times += 1

    db.commit()

    return {"message": "Pickup failed, items restored to online display"}
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
@router.post("/pickup/success", response_model=dict)
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
            id=r.item_id
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
@router.post("/pickup/fail", response_model=dict)
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
            id=r.item_id
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

# -------------------------
# Comments (查看留言)
# -------------------------
@router.get("/comments/{food_id}", response_model=list)
def get_comments(food_id: int, db: Session = Depends(get_db)):
    """
    Retrieve comments for a given food_id.
    Returns a list of dicts: {id, user_id, food_id, comment}.
    """
    comments = db.query(models.Comment).filter_by(food_id=food_id).order_by(models.Comment.id.asc()).all()

    return [
        {
            "id": getattr(c, "id", None),
            "user_id": getattr(c, "user_id", None),
            "food_id": getattr(c, "food_id", None),
            "comment": getattr(c, "comment", None),
            
        }
        for c in comments
    ]


@router.get("/food/{food_id}/user/{user_id}", response_model=schemas.Warning)
def check_warning(food_id: int, user_id: int, db: Session = Depends(get_db)):
    """
    Check warning times for a given user_id and food_id.
    Returns a Warning object; if none exists, returns a zeroed warning entry.
    """
    warning = db.query(models.Warning).filter_by(user_id=user_id, food_id=food_id).first()


    if not warning:
        return schemas.Warning(user_id=user_id, food_id=food_id, warning_times=0)


    return schemas.Warning(
       
        user_id=getattr(warning, "user_id", None),
        food_id=getattr(warning, "food_id", None),
        warning_times=getattr(warning, "warning_times", 0),
    )

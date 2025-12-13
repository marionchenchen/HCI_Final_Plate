from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..db import get_db
from .. import models, schemas

router = APIRouter(
    prefix="/users",
    tags=["users"],
)

@router.post("/", response_model=schemas.User, status_code=status.HTTP_201_CREATED)
def create_user(
    user_in: schemas.UserCreate,
    db: Session = Depends(get_db),
):
    # 檢查 email 是否已存在
    existing_user = (
        db.query(models.User)
        .filter(models.User.email == user_in.email)
        .first()
    )
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = models.User(
        email=user_in.email,
        password=user_in.password,   
        name=user_in.name,
        nickname=user_in.nickname,
        profile_pic=user_in.profile_pic,
        gps_latitude=user_in.gps_latitude,
        gps_longitude=user_in.gps_longitude,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user

@router.get("/", response_model=list[schemas.User])
def list_users(db: Session = Depends(get_db)):
    users = db.query(models.User).all()
    return users



@router.patch("/{user_id}/location", response_model=schemas.User)
def update_user_location(
    user_id: int,
    location: schemas.UserLocationUpdate,
    db: Session = Depends(get_db),
):
    user = db.query(models.User).filter(models.User.user_id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.gps_latitude = location.gps_latitude
    user.gps_longitude = location.gps_longitude

    db.commit()
    db.refresh(user)

    return user

@router.post("/locations", response_model=list[schemas.UserLocationResponse])
def get_users_locations(
    req: schemas.UserLocationRequest,
    db: Session = Depends(get_db),
):
    users = (
        db.query(models.User)
        .filter(models.User.user_id.in_(req.user_ids))
        .all()
    )

    return [
        {
            "user_id": u.user_id,
            "gps_latitude": u.gps_latitude,
            "gps_longitude": u.gps_longitude,
        }
        for u in users
    ]

from fastapi import APIRouter, Depends, HTTPException   
from sqlalchemy.orm import Session
from datetime import datetime
import random

from ..db import get_db
from .. import models, schemas

router = APIRouter(
    prefix="/posts",
    tags=["posts"],
)

@router.post("/", response_model=schemas.Post)
def create_post(post_in: schemas.PostCreate, db: Session = Depends(get_db)):   
    """發布剩食貼文"""

    # create post main
    post = models.Post(
        user_id=post_in.user_id,
        address=post_in.address,
        tag=post_in.tag,
        note=post_in.note,
        gps_latitude=post_in.gps_latitude,
        gps_longitude=post_in.gps_longitude,
        time_restriction=post_in.time_restriction,
        distance_restriction=post_in.distance_restriction,
        verification_icon=random.randint(1, 3),
    )
    db.add(post)

    # sub: create items
    for item_in in post_in.items:
        item = models.Item(
            item=item_in.item,
            number_online=item_in.number_online,
            number_onsite=item_in.number_onsite,
            post=post  #food_id
        )
        db.add(item)
    # sub: create pictures
    if post_in.pictures:
        for pic_in in post_in.pictures:
            picture = models.Picture(
                picture=pic_in.picture,
                post=post
            )
            db.add(picture)

    db.commit()
    db.refresh(post)

    return post

@router.get("/", response_model=list[schemas.Post])
def list_posts(db: Session = Depends(get_db)):
    """取得所有貼文"""

    posts = db.query(models.Post).all()
    return posts

@router.delete("/{food_id}")
def delete_post(food_id: int, db: Session = Depends(get_db)):
    """刪文"""

    post = db.query(models.Post).filter(models.Post.food_id == food_id).first()

    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    db.delete(post)
    db.commit()

    return {"message": f"Post {food_id} deleted"}

@router.patch("/{food_id}", response_model=schemas.Post)
def update_post(food_id: int, post_in: schemas.PostUpdate, db: Session = Depends(get_db)):
    """編輯貼文"""

    post = db.query(models.Post).filter(models.Post.food_id == food_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post_in.tag is not None:
        post.tag = post_in.tag
    if post_in.note is not None:
        post.note = post_in.note
    if post_in.time_restriction is not None:
        post.time_restriction = post_in.time_restriction
    if post_in.distance_restriction is not None:
        post.distance_restriction = post_in.distance_restriction

    # 更新 items
    if post_in.items:
        for item_update in post_in.items:
            item = db.query(models.Item).filter(models.Item.id == item_update.id).first()
            if not item:
                raise HTTPException(status_code=404, detail=f"Item {item_update.id} not found")
            delta = item_update.number_online - item.number_online
            item.number_online = item_update.number_online
            item.number_onsite += delta

    # 更新圖
    if post_in.pictures is not None:
        # 刪舊圖
        db.query(models.Picture).filter(models.Picture.food_id == food_id).delete()

        # 加新圖
        for pic_in in post_in.pictures:
            picture = models.Picture(
                picture=pic_in.picture,
                post=post
            )
            db.add(picture)

    post.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(post)

    return post

@router.get("/{food_id}", response_model=schemas.Post)
def get_post(food_id: int, db: Session = Depends(get_db)):
    """取得單一貼文"""

    post = (
        db.query(models.Post)
        .filter(models.Post.food_id == food_id)
        .first()
    )

    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    return post
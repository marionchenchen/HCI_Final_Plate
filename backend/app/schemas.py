from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import List, Optional

# ---------- Item Schemas ----------
class ItemCreate(BaseModel):
    item: str
    number_online: int
    number_onsite: int


class Item(BaseModel):
    id: int
    item: str
    number_online: int
    number_onsite: int

    model_config = {"from_attributes": True}

class ItemUpdate(BaseModel):
    id: int
    number_online: int

# ---------- Picture Schemas ----------
class PictureCreate(BaseModel):
    picture: str

class Picture(BaseModel):
    id: int
    picture: str
    model_config = {"from_attributes": True}

# ---------- Comment Schemas ----------
class Comment(BaseModel):
    id: int
    user_id: Optional[int] = None
    comment: str
    model_config = {"from_attributes": True}

# ---------- Post Schemas ----------
class PostCreate(BaseModel):
    user_id: Optional [int] = None
    address: str
    tag: Optional[str] = None
    note: Optional[str] = None

    gps_latitude: Optional[float] = None
    gps_longitude: Optional[float] = None

    items: List[ItemCreate]
    pictures: Optional[List[PictureCreate]] = None 


class Post(BaseModel):
    food_id: int
    user_id: Optional [int] = None
    address: str
    tag: Optional[str]
    note: Optional[str]

    gps_latitude: Optional[float]
    gps_longitude: Optional[float]

    created_at: datetime 
    updated_at: datetime 

    items: List[Item] = []
    pictures: List[Picture] = []
    comments: List[Comment] = []

    model_config = {"from_attributes": True,}

class PostUpdate(BaseModel):
    tag: Optional[str] = None
    note: Optional[str] = None
    time_restriction: Optional[str] = None
    distance_restriction: Optional[float] = None
    items: Optional[List[ItemUpdate]] = None
    pictures: Optional[List[PictureCreate]] = None 

# ---------- Pickup ----------
class PickupSuccess(BaseModel):
    user_id: Optional [int] = None
    food_id: int
    comment: Optional[str] = None


class PickupFail(BaseModel):
    user_id: Optional [int] = None
    food_id: int
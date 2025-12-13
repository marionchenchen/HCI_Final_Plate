from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import List, Optional


# ---------- User ----------
class UserCreate(BaseModel):
    email: str
    password: str
    name: Optional[str] = None
    nickname: Optional[str] = None
    profile_pic: Optional[str] = None
    gps_latitude: Optional[float] = None
    gps_longitude: Optional[float] = None

class User(BaseModel):
    user_id: int
    email: str
    name: Optional[str] = None
    nickname: Optional[str] = None
    profile_pic: Optional[str] = None
    gps_latitude: Optional[float] = None
    gps_longitude: Optional[float] = None

    model_config = {"from_attributes": True}

class UserLocationUpdate(BaseModel):
    gps_latitude: float
    gps_longitude: float

class UserLocationRequest(BaseModel):
    user_ids: List[int]

class UserLocationResponse(BaseModel):
    user_id: int
    gps_latitude: float | None
    gps_longitude: float | None

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

# ---------- Reservation Schemas ----------
class ReservationCreate(BaseModel):
    user_id: int
    food_id: int
    item_id: int
    number_book: int


class ItemBooking(BaseModel):
    item_id: int
    number_book: int


class ReservationCreateMultiple(BaseModel):
    user_id: int
    food_id: int
    gps_latitude: Optional[float] = None
    gps_longitude: Optional[float] = None
    items: List[ItemBooking]


class Reservation(BaseModel):
    reservation_id: int
    user_id: int
    food_id: int
    item_id: int
    number_book: int
    reserve_at: datetime
    gps_latitude: Optional[float] = None
    gps_longitude: Optional[float] = None

    model_config = {"from_attributes": True}

class ReservationModify(BaseModel):
    modify: int  # 正數表示增加預約數量（會扣除 item.number_online），負數表示減少預約數量（會回補 item.number_online）


class ReservationModifyItem(BaseModel):
    item_id: int
    new_amount: int


class ReservationModifyMultiple(BaseModel):
    items: List[ReservationModifyItem]


class ReservationsByUser(BaseModel):
    user_id: int
    reservations: List[Reservation]


class ReservationWithItem(BaseModel):
    reservation_id: int
    user_id: int
    food_id: int
    item_id: int
    item_name: str
    gps_latitude: Optional[float] = None
    gps_longitude: Optional[float] = None
    number_book: int
    reserve_at: datetime

    model_config = {"from_attributes": True}


class ReservationsByUserWithItem(BaseModel):
    user_id: int
    reservations: List[ReservationWithItem]


class ReservationsByFoodWithItem(BaseModel):
    food_id: int
    reservations: List[ReservationWithItem]






# ---------- Post Schemas ----------
class PostCreate(BaseModel):
    user_id: Optional [int] = None
    address: str
    tag: Optional[str] = None
    note: Optional[str] = None

    gps_latitude: Optional[float] = None
    gps_longitude: Optional[float] = None
    time_restriction: Optional[int] = None
    distance_restriction: Optional[float] = None

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
    time_restriction: Optional[int]
    distance_restriction: Optional[float]

    created_at: datetime 
    updated_at: datetime 

    items: List[Item] = []
    pictures: List[Picture] = []
    comments: List[Comment] = []

    model_config = {"from_attributes": True,}

class PostUpdate(BaseModel):
    tag: Optional[str] = None
    note: Optional[str] = None
    time_restriction: Optional[int] = None
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


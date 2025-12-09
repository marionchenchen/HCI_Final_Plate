from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime


from .db import Base


# ============================================================
# table 1: USERS
# ============================================================
class User(Base):
    __tablename__ = "users"


    user_id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    password = Column(String)
    name = Column(String)
    nickname = Column(String)
    profile_pic = Column(String)          # 圖片URL
    gps_latitude = Column(Float)
    gps_longitude = Column(Float)


    # relationship examples
    posts = relationship("Post", back_populates="user")
    reservations = relationship("Reservation", back_populates="user")
    comments = relationship("Comment", back_populates="user")
    follows = relationship("Follow", back_populates="user")
    warnings = relationship("Warning", back_populates="user")
    preferences = relationship("Preference", back_populates="user")




# ============================================================
# table 2: POSTS
# ============================================================
class Post(Base):
    __tablename__ = "posts"


    food_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=True)


    address = Column(String)
    tag = Column(String)
    note = Column(String)


    time_restriction = Column(Integer)
    distance_restriction = Column(Float)


    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)


    verification_icon = Column(Integer)
    gps_latitude = Column(Float)
    gps_longitude = Column(Float)


    # relationships
    user = relationship("User", back_populates="posts")
    pictures = relationship("Picture", back_populates="post",cascade="all, delete")
    items = relationship( "Item",back_populates="post",cascade="all, delete")
    comments = relationship("Comment", back_populates="post",cascade="all, delete")
    reservations = relationship("Reservation", back_populates="post",cascade="all, delete")
    warnings = relationship("Warning", back_populates="post",cascade="all, delete")
    follows = relationship("Follow", back_populates="post",cascade="all, delete")

# ============================================================
# table 3: ITEMS（某個 food_id 的細項）
# ============================================================
class Item(Base):
    __tablename__ = "items"


    id = Column(Integer, primary_key=True, index=True)
    food_id = Column(Integer, ForeignKey("posts.food_id"))


    item = Column(String)
    number_online = Column(Integer)
    number_onsite = Column(Integer)


    post = relationship("Post", back_populates="items")

# ============================================================
# table 4: PICTURES
# ============================================================
class Picture(Base):
    __tablename__ = "pictures"


    id = Column(Integer, primary_key=True, index=True)
    food_id = Column(Integer, ForeignKey("posts.food_id"))
    picture = Column(String)                  # 存 URL or Base64


    post = relationship("Post", back_populates="pictures")

# ============================================================
# table 5: COMMENTS
# ============================================================
class Comment(Base):
    __tablename__ = "comments"


    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"))
    food_id = Column(Integer, ForeignKey("posts.food_id"))


    comment = Column(String)


    user = relationship("User", back_populates="comments")
    post = relationship("Post", back_populates="comments")




# ============================================================
# table 6: RESERVATIONS（預約）
# ============================================================
class Reservation(Base):
    __tablename__ = "reservations"


    reservation_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"))
    food_id = Column(Integer, ForeignKey("posts.food_id"))


    item_id = Column(Integer, ForeignKey("items.id"))
    number_book = Column(Integer)
    reserve_at = Column(DateTime, default=datetime.utcnow)


    user = relationship("User", back_populates="reservations")
    post = relationship("Post", back_populates="reservations")




# ============================================================
# table 7: WARNINGS（對某貼文警告次數）
# ============================================================
class Warning(Base):
    __tablename__ = "warnings"


    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"))
    food_id = Column(Integer, ForeignKey("posts.food_id"))
    warning_times = Column(Integer, default=0)


    user = relationship("User", back_populates="warnings")
    post = relationship("Post", back_populates="warnings")




# ============================================================
# table 8: PREFERENCES（使用者喜歡的 tag）
# ============================================================
class Preference(Base):
    __tablename__ = "preferences"


    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"))
    tag = Column(String)


    user = relationship("User", back_populates="preferences")




# ============================================================
# table 9: FOLLOW（使用者追蹤某食物）
# ============================================================
class Follow(Base):
    __tablename__ = "follow"


    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"))
    food_id = Column(Integer, ForeignKey("posts.food_id"))


    user = relationship("User", back_populates="follows")
    post = relationship("Post", back_populates="follows")


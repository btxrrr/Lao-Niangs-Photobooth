from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class User(Base):
    __tablename__ = "users"
    id               = Column(Integer, primary_key=True, index=True)
    email            = Column(String, unique=True, index=True, nullable=False)
    username         = Column(String, unique=True, index=True, nullable=False)
    hashed_password  = Column(String, nullable=False)
    is_active        = Column(Boolean, default=True)
    role             = Column(String, default="user")
    reset_token      = Column(String, nullable=True)
    reset_token_expires = Column(DateTime(timezone=True), nullable=True)
    created_at       = Column(DateTime(timezone=True), server_default=func.now())
    updated_at       = Column(DateTime(timezone=True), onupdate=func.now())
    captures         = relationship("Capture", back_populates="owner", cascade="all, delete-orphan")
    pose_references  = relationship("PoseReference", back_populates="owner", cascade="all, delete-orphan")


class Capture(Base):
    __tablename__ = "captures"
    id                = Column(Integer, primary_key=True, index=True)
    user_id           = Column(Integer, ForeignKey("users.id"), nullable=False)
    filename          = Column(String, nullable=False)
    original_filename = Column(String, nullable=True)
    file_path         = Column(String, nullable=False)
    content_type      = Column(String, nullable=True)
    file_size_bytes   = Column(Integer, nullable=True)
    caption           = Column(Text, nullable=True)
    frame_style       = Column(String, nullable=True)
    is_flipbook       = Column(Boolean, default=False)
    media_type        = Column(String, default="photo")   # "photo" | "gif"
    created_at        = Column(DateTime(timezone=True), server_default=func.now())
    owner             = relationship("User", back_populates="captures")


class PoseReference(Base):
    # A pose guide image a user uploaded themselves (any art style —
    # anime, outline sketch, real photo, whatever they like) instead of
    # one of the built-in procedural stick-figure poses. Saved with a
    # name + shot type so it shows up in the Pose Assistant library
    # for that shot type on future visits.
    __tablename__ = "pose_references"
    id                = Column(Integer, primary_key=True, index=True)
    user_id           = Column(Integer, ForeignKey("users.id"), nullable=False)
    name              = Column(String, nullable=False)
    shot_type         = Column(String, nullable=False, default="single")   # "single" | "duo" | "trio" | "quad"
    filename          = Column(String, nullable=False)
    original_filename = Column(String, nullable=True)
    file_path         = Column(String, nullable=False)
    content_type      = Column(String, nullable=True)
    file_size_bytes   = Column(Integer, nullable=True)
    created_at        = Column(DateTime(timezone=True), server_default=func.now())
    owner             = relationship("User", back_populates="pose_references")

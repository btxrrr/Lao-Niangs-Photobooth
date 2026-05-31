from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    role = Column(String, default="user")  # "user" | "admin"

    # Password reset
    reset_token = Column(String, nullable=True)
    reset_token_expires = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    captures = relationship("Capture", back_populates="owner", cascade="all, delete-orphan")


class Capture(Base):
    __tablename__ = "captures"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    filename = Column(String, nullable=False)          # stored filename on disk
    original_filename = Column(String, nullable=True)  # what the user/browser called it
    file_path = Column(String, nullable=False)         # relative path under upload_dir
    content_type = Column(String, nullable=True)       # e.g. image/jpeg
    file_size_bytes = Column(Integer, nullable=True)

    # Milestone 2+ metadata (nullable so Milestone 1 works fine)
    caption = Column(Text, nullable=True)
    frame_style = Column(String, nullable=True)   # e.g. "retro", "festive"
    is_flipbook = Column(Boolean, default=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    owner = relationship("User", back_populates="captures")

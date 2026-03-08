"""Product model for IKEA products."""

from sqlmodel import SQLModel, Field, Column
from sqlalchemy import JSON
from typing import Optional
from datetime import datetime
import uuid


class Product(SQLModel, table=True):
    """SQLModel for IKEA products with full schema."""

    __tablename__ = "products"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    article_number: str = Field(unique=True, index=True)  # e.g., "123.456.78"
    name: str = Field(index=True)  # e.g., "BILLY"
    description: str  # e.g., "Bookcase, white, 80x28x202 cm"

    # Category hierarchy
    category: str = Field(index=True)  # e.g., "Storage"
    subcategory: str  # e.g., "Bookcases"
    product_type: str  # e.g., "Bookcase"

    # Pricing
    price: float
    currency: str = Field(default="SEK")

    # Physical attributes
    width_cm: Optional[float] = None
    height_cm: Optional[float] = None
    depth_cm: Optional[float] = None
    weight_kg: Optional[float] = None

    # Store location
    zone: str  # e.g., "warehouse", "showroom-living"
    aisle: Optional[int] = None  # Warehouse aisle number
    bay: Optional[int] = None  # Bay within aisle
    section: Optional[str] = None  # A, B, C, D

    # Inventory
    stock_quantity: int = Field(default=0)
    stock_last_checked: datetime = Field(default_factory=datetime.utcnow)

    # Metadata
    image_url: Optional[str] = None
    tags: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

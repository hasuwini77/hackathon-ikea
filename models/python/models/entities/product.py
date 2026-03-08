"""
Product Entity - IKEA Product Data Model

Represents a product in the IKEA warehouse with location, stock, and pricing information.
Designed for offline-first sync with Couchbase Lite and deserialization from JSON.
"""

from typing import Literal, Optional
from datetime import datetime
from pydantic import BaseModel, Field, field_validator, ConfigDict


class Dimensions(BaseModel):
    """Product dimensions information"""

    length: float = Field(..., description="Length of the product")
    width: float = Field(..., description="Width of the product")
    height: float = Field(..., description="Height of the product")
    unit: str = Field(default="cm", description="Unit of measurement (e.g., 'cm', 'in')")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {"length": 77, "width": 148, "height": 77, "unit": "cm"}
        }
    )


class ProductLocation(BaseModel):
    """Warehouse location information for a product"""

    aisle: int = Field(..., description="Aisle number in warehouse")
    bay: int = Field(..., description="Bay number within aisle")
    section: str = Field(..., description="Section identifier (e.g., 'LIVING_ROOM')")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {"aisle": 4, "bay": 1, "section": "LIVING_ROOM"}
        }
    )


class Product(BaseModel):
    """IKEA Product entity with offline-first support"""

    # Core identity and metadata
    id: str = Field(..., description='Document ID in format "prod_0001"')

    # Basic product information
    article_number: str = Field(
        ..., description='IKEA article number (e.g., "110.969.53")'
    )
    name: str = Field(..., description='Product name (e.g., "STUVA Storage unit")')
    description: str = Field(..., description="Product description")
    category: str = Field(..., description="Product category (e.g., 'Living Room')")
    product_type: str = Field(
        ..., description="Product type (e.g., 'Storage unit', 'Cushion cover')"
    )

    # Pricing and inventory
    price: float = Field(..., gt=0, description="Product price")
    currency: str = Field(..., description='Currency code (e.g., "SEK", "USD")')
    stock: int = Field(..., ge=0, description="Current stock quantity")
    in_stock: bool = Field(..., description="Whether the product is in stock")

    # Physical characteristics
    dimensions: Dimensions = Field(..., description="Product dimensions")
    weight: float = Field(..., ge=0, description="Product weight in kg")
    colors_available: list[str] = Field(
        default_factory=list, description="Available colors for this product"
    )
    assembly_required: bool = Field(
        ..., description="Whether assembly is required"
    )

    # Warehouse location
    store_location: ProductLocation = Field(
        ..., description="Warehouse location information"
    )

    @field_validator("currency")
    @classmethod
    def validate_currency(cls, v):
        """Validate currency code is uppercase 3-letter code"""
        if not v.isupper() or len(v) != 3:
            raise ValueError("Currency must be a 3-letter uppercase code (e.g., SEK, USD)")
        return v

    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "id": "prod_0001",
                "article_number": "110.969.53",
                "name": "STUVA Storage unit",
                "description": "Practical and stylish storage unit.",
                "category": "Living Room",
                "product_type": "Storage unit",
                "price": 3430,
                "currency": "SEK",
                "stock": 23,
                "in_stock": True,
                "dimensions": {
                    "length": 77,
                    "width": 148,
                    "height": 77,
                    "unit": "cm",
                },
                "weight": 2.0,
                "colors_available": ["Beige", "Brown", "Grey"],
                "assembly_required": True,
                "store_location": {
                    "aisle": 4,
                    "bay": 1,
                    "section": "LIVING_ROOM",
                },
            }
        },
    )


def create_product_id(article_number: str) -> str:
    """Creates a Product document ID from an article number"""
    return f"product:{article_number}"


def get_article_number_from_id(product_id: str) -> str:
    """Extracts article number from a Product document ID"""
    return product_id.replace("product:", "")

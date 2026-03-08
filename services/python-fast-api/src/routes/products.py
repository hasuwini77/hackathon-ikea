"""Products API routes for IKEA product management."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import SQLModel, Session, select, col, Field
from typing import Optional
from datetime import datetime

from models.product import Product
from init.database import get_session

router = APIRouter(prefix="/products", tags=["products"])


@router.get("", response_model=list[Product])
async def list_products(
    session: Session = Depends(get_session),
    search: Optional[str] = Query(None, description="Search in name or description"),
    category: Optional[str] = Query(None, description="Filter by category"),
    zone: Optional[str] = Query(None, description="Filter by zone"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records to return"),
) -> list[Product]:
    """
    List all products with optional filtering and search.

    Parameters:
    - search: Search term for product name or description
    - category: Filter by product category
    - zone: Filter by store zone
    - skip: Number of records to skip (for pagination)
    - limit: Maximum number of records to return (max 1000)

    Returns:
        List of products matching the filters
    """
    statement = select(Product)

    # Apply search filter
    if search:
        search_filter = (
            col(Product.name).ilike(f"%{search}%")
            | col(Product.description).ilike(f"%{search}%")
            | col(Product.article_number).ilike(f"%{search}%")
        )
        statement = statement.where(search_filter)

    # Apply category filter
    if category:
        statement = statement.where(Product.category == category)

    # Apply zone filter
    if zone:
        statement = statement.where(Product.zone == zone)

    # Apply pagination
    statement = statement.offset(skip).limit(limit)

    products = session.exec(statement).all()
    return products


@router.get("/{article_number}", response_model=Product)
async def get_product(
    article_number: str,
    session: Session = Depends(get_session),
) -> Product:
    """
    Get a single product by article number.

    Parameters:
    - article_number: The IKEA article number (e.g., "123.456.78")

    Returns:
        Product details

    Raises:
        HTTPException: 404 if product not found
    """
    statement = select(Product).where(Product.article_number == article_number)
    product = session.exec(statement).first()

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with article number '{article_number}' not found",
        )

    return product


class StockUpdate(SQLModel):
    """Schema for updating product stock."""

    stock_quantity: int = Field(ge=0, description="New stock quantity (must be >= 0)")


@router.patch("/{article_number}/stock", response_model=Product)
async def update_stock(
    article_number: str,
    stock_update: StockUpdate,
    session: Session = Depends(get_session),
) -> Product:
    """
    Update the stock quantity for a product.

    Parameters:
    - article_number: The IKEA article number (e.g., "123.456.78")
    - stock_quantity: New stock quantity (must be >= 0)

    Returns:
        Updated product details

    Raises:
        HTTPException: 404 if product not found
    """
    statement = select(Product).where(Product.article_number == article_number)
    product = session.exec(statement).first()

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with article number '{article_number}' not found",
        )

    # Update stock quantity and timestamp
    product.stock_quantity = stock_update.stock_quantity
    product.stock_last_checked = datetime.utcnow()
    product.updated_at = datetime.utcnow()

    session.add(product)
    session.commit()
    session.refresh(product)

    return product

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List

from models.location import ProductLocation
from utils.axis_decoder import decoder

router = APIRouter(prefix="/api", tags=["AXIS"])

class ProductCodeRequest(BaseModel):
    name: str = Field(..., description="5-character product code (e.g. HEGRA)")

@router.post("/decode", response_model=ProductLocation)
async def decode_product(request: ProductCodeRequest):
    """
    Decodes a product name/code into its physical location components.
    """
    result = decoder.decode(request.name)
    if "error" in result:
        # We could raise 400, but ProductLocation model expects strings. 
        # But wait, ProductLocation doesn't have an error field.
        # If decode returns error, we might want to raise HTTPException.
        # But decode() as implemented returns a dict with code, category="Unknown" etc.
        # So it conforms to ProductLocation schema (strings).
        # We'll validat length here too just in case.
        if len(request.name.strip()) != 5:
             raise HTTPException(status_code=400, detail="Product code must be exactly 5 characters")
    
    return ProductLocation(**result)

@router.get("/products", response_model=List[ProductLocation])
async def get_products():
    """
    Returns a mock catalogue of products with their decoded AXIS locations.
    """
    mock_codes = [
        "HEGRA", # Home furnishings, East, G, 18, A (Eye)
        "KWCBA", # Kitchen, West, C, 2, A
        "BNCXY", # Bedroom, North, C, 24, Y
        "OSEDA", # Office, South, E, 4, A
        "LMA1A", # Lighting, Market, A, 1, A
        "TSG2C", # Textiles, South, G, 2, C
        "SWH3X", # Storage, Warehouse, H, 3, X
        "DND4B", # Decoration, North, D, 4, B
        "CME5Z", # Cooking, Market, E, 5, Z
        "RWE6A"  # Rugs, West, E, 6, A
    ]
    
    products = []
    for code in mock_codes:
        decoded = decoder.decode(code)
        products.append(ProductLocation(**decoded))
        
    return products

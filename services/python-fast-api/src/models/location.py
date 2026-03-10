from pydantic import BaseModel, Field

class ProductLocation(BaseModel):
    """
    Physical location of a product in the store based on AXIS naming convention.
    """
    category: str = Field(..., description="Product category (e.g., Home furnishings, Kitchen)")
    zone: str = Field(..., description="Store zone (e.g., East Wing, North)")
    aisle: str = Field(..., description="Aisle identifier")
    row: str = Field(..., description="Row number/letter")
    shelf: str = Field(..., description="Shelf level")
    code: str = Field(..., description="The original 5-character code")
    
    class Config:
        schema_extra = {
            "example": {
                "code": "HEGRA",
                "category": "Home furnishings",
                "zone": "East Wing",
                "aisle": "G",
                "row": "18",
                "shelf": "Eye level"
            }
        }

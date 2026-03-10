import os
import json
import logging
from typing import Dict, Optional, Any

# Configure logging
logger = logging.getLogger(__name__)

# Default mapping configuration
DEFAULT_AXIS_CONFIG = {
    "category": {
        "H": "Home furnishings",
        "K": "Kitchen",
        "B": "Bedroom",
        "O": "Office",
        "L": "Lighting",
        "T": "Textiles",
        "S": "Storage",
        "D": "Decoration",
        "C": "Cooking",
        "R": "Rugs"
    },
    "zone": {
        "E": "East Wing",
        "W": "West Wing",
        "N": "North",
        "S": "South",
        "C": "Central",
        "M": "Market Hall",
        "W": "Warehouse"
    },
    # Aisle is direct char mapping by default, but can be overridden
    "row": {
        # A=1, B=2, ... 
        # Will be generated programmatically if not found
    },
    "shelf": {
        "A": "Eye level",
        "B": "Above eye",
        "C": "Top",
        "X": "Floor level",
        "Y": "Lower shelf",
        "Z": "Bottom"
    }
}

# Generate Row mapping A-Z -> 1-26
for i in range(26):
    char = chr(65 + i)
    DEFAULT_AXIS_CONFIG["row"][char] = str(i + 1)

class AxisDecoder:
    """
    Decodes product names using AXIS naming convention.
    Uses Couchbase for configuration if available, falls back to defaults.
    """
    
    def __init__(self):
        self.config = DEFAULT_AXIS_CONFIG
        self.couchbase_url = os.getenv("COUCHBASE_URL", "http://edge-server:59840")
        self.bucket = os.getenv("COUCHBASE_BUCKET", "ikea_products")
        
        # Try to load config from Couchbase (if we were using a real client with async init)
        # For now, we rely on lazy loading or periodic updates using fetch_config
    
    def get_config(self) -> Dict[str, Dict[str, str]]:
        """Returns current configuration (defaults + any updates)"""
        return self.config

    def decode(self, name: str) -> Dict[str, str]:
        """
        Decodes a 5-character product code into location components.
        
        Args:
            name: 5-character string (e.g. "HEGRA")
            
        Returns:
            Dict with keys: category, zone, aisle, row, shelf, code
        """
        name = name.upper().strip()
        if len(name) != 5:
            # Handle invalid length gracefully or raise error
            # For simplicity, returning "Unknown" for invalid parts
            return {
                "code": name,
                "category": "Unknown",
                "zone": "Unknown",
                "aisle": "Unknown",
                "row": "Unknown",
                "shelf": "Unknown",
                "error": "Invalid code length"
            }
            
        category_char = name[0]
        zone_char = name[1]
        aisle_char = name[2]
        row_char = name[3]
        shelf_char = name[4]
        
        return {
            "code": name,
            "category": self.config["category"].get(category_char, f"Unknown Category ({category_char})"),
            "zone": self.config["zone"].get(zone_char, f"Unknown Zone ({zone_char})"),
            "aisle": f"Aisle {aisle_char}", # Aisle is direct mapping usually
            "row": f"Row {self.config['row'].get(row_char, row_char)}",
            "shelf": self.config["shelf"].get(shelf_char, f"Shelf {shelf_char}")
        }

    async def fetch_config_from_couchbase(self):
        """
        Attempts to fetch updated config from Couchbase.
        This would be used by a background task or startup event.
        """
        # Note: In a real implementation using 'couchbase-client', we would use:
        # doc = await client.get("axis_config", "naming_convention")
        # Here we simulate or define the structure.
        # Since we don't have the client library installed/generated, 
        # we will skip the network call implementation to ensure it runs offline.
        # The logic is placeholder for where the Couchbase integration goes.
        pass

# Global instance
decoder = AxisDecoder()

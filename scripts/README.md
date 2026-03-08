# IKEA Product Dataset Generator and Seeder

Scripts for generating realistic IKEA product data and seeding it into Couchbase Edge Server.

## Files

- `generate_products.py` - Generates realistic IKEA product dataset
- `seed_couchbase.py` - Seeds products into Couchbase Edge Server
- `requirements.txt` - Python dependencies
- `data/products.json` - Generated product data (created after running generate script)

## Prerequisites

1. Python 3.7 or higher
2. Couchbase Edge Server running at `http://127.0.0.1:59840`

## Installation

Install required dependencies:

```bash
pip install -r requirements.txt
```

## Usage

### Step 1: Generate Products

Generate 220+ realistic IKEA products:

```bash
python scripts/generate_products.py
```

This creates `scripts/data/products.json` with:
- 220 realistic IKEA products
- Authentic Swedish product names (KALLAX, MALM, BILLY, etc.)
- 8 categories: Living Room, Bedroom, Kitchen, Bathroom, Office, Outdoor, Kids, Storage
- Realistic pricing in SEK (Swedish Krona)
- Store locations with aisle, bay, and section
- Stock levels, dimensions, colors, and descriptions

### Step 2: Seed Database

Load products into Couchbase Edge Server:

```bash
python scripts/seed_couchbase.py
```

This will:
- Connect to Couchbase at `http://127.0.0.1:59840`
- Create database `ikea_products` if it doesn't exist
- Insert/update all products
- Display progress and statistics
- Show sample products

## Product Data Structure

Each product includes:

```json
{
  "id": "prod_0001",
  "article_number": "110.969.53",
  "name": "KALLAX Shelf unit",
  "category": "Living Room",
  "product_type": "Shelf unit",
  "price": 1495,
  "currency": "SEK",
  "stock": 42,
  "store_location": {
    "aisle": 4,
    "bay": 7,
    "section": "LIVING_ROOM"
  },
  "description": "Simple, modern design with clean lines...",
  "dimensions": {
    "length": 77,
    "width": 77,
    "height": 147,
    "unit": "cm"
  },
  "weight": 23.5,
  "colors_available": ["White", "Black", "Brown"],
  "assembly_required": true,
  "in_stock": true
}
```

## Product Categories

- **Living Room**: Sofas, coffee tables, bookcases, TV benches, armchairs
- **Bedroom**: Beds, wardrobes, dressers, nightstands, mattresses
- **Kitchen**: Dining tables, chairs, cookware, dinnerware, utensils
- **Bathroom**: Cabinets, mirrors, towels, storage
- **Office**: Desks, chairs, filing cabinets, organizers
- **Outdoor**: Furniture, planters, lighting, cushions
- **Kids**: Children's furniture, toys, storage, play items
- **Storage**: Shelving units, boxes, baskets, organizers

## Accessing the Data

After seeding, access the database:

- All documents: `http://127.0.0.1:59840/ikea_products/_all_docs`
- Specific product: `http://127.0.0.1:59840/ikea_products/prod_0001`
- Database info: `http://127.0.0.1:59840/ikea_products`

## Customization

Edit `generate_products.py` to:
- Change number of products (default: 220)
- Add more product names
- Adjust price ranges
- Modify categories
- Customize descriptions

## Troubleshooting

**Couchbase connection error:**
- Ensure Couchbase Edge Server is running
- Check URL: `http://127.0.0.1:59840`
- Verify port 59840 is accessible

**No products file:**
- Run `generate_products.py` first before seeding
- Check `scripts/data/products.json` exists

**Import errors:**
- Install dependencies: `pip install -r requirements.txt`
- Check Python version: `python --version` (requires 3.7+)

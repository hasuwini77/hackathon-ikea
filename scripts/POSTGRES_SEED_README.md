# PostgreSQL Product Seeding Script

This script generates and seeds 200 realistic IKEA products into a PostgreSQL database.

## Overview

The script creates products across three IKEA store zones:
- **Warehouse** (~60 products): Flat-pack furniture with aisle/bay/section locations
- **Market Hall** (~80 products): Smaller items like textiles, cookware, lighting, organization
- **Showroom** (~60 products): Display furniture in room settings

## Installation

1. Install Python dependencies:
```bash
pip install -r scripts/requirements.txt
```

Or install manually:
```bash
pip install sqlalchemy psycopg2-binary
```

## Database Setup

The script expects a PostgreSQL database. Default connection:
```
postgresql://postgres:postgres@localhost:5432/ikea_products
```

To create the database:
```bash
# Using psql
createdb ikea_products

# Or with SQL
psql -U postgres -c "CREATE DATABASE ikea_products;"
```

## Usage

### Basic Usage (Default Database)
```bash
python scripts/seed_postgres.py
```

### Custom Database URL
```bash
export DATABASE_URL="postgresql://user:password@host:port/database"
python scripts/seed_postgres.py
```

### Example with Docker PostgreSQL
```bash
# Start PostgreSQL in Docker
docker run -d \
  --name postgres-ikea \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=ikea_products \
  -p 5432:5432 \
  postgres:15

# Run seeder
python scripts/seed_postgres.py
```

## Product Data Structure

Each product includes:

```python
{
    "id": "prod_0001",
    "article_number": "123.456.78",
    "name": "BILLY",
    "description": "Bookcase, white, 80x28x202 cm",
    "category": "Living Room",
    "subcategory": None,
    "product_type": "Bookcase",
    "price": 699.00,
    "currency": "SEK",
    "width_cm": 80,
    "height_cm": 202,
    "depth_cm": 28,
    "weight_kg": 30,
    "zone": "warehouse",
    "aisle": 15,
    "bay": 3,
    "section": "A",
    "stock_quantity": 45,
    "in_stock": True,
    "image_url": "https://www.ikea.com/se/sv/images/products/billy-bookcase.jpg",
    "tags": ["warehouse", "storage", "bookcase", "white"],
    "colors_available": ["White", "Black-brown"],
    "assembly_required": True
}
```

## Product Categories

### Showroom Products
- **Living Room**: SÖDERHAMN, KIVIK sofas; LACK, LIATORP tables; BESTÅ TV units
- **Bedroom**: MALM, HEMNES beds; PAX wardrobes; NORDLI dressers
- **Home Office**: BEKANT, MICKE desks; MARKUS, JÄRVFJÄLLET chairs
- **Kitchen**: METOD cabinets; VOXTORP, RINGHULT fronts
- **Dining**: EKEDALEN, MÖRBYLÅNGA tables; INGOLF, HENRIKSDAL chairs
- **Children's**: STUVA, SMÅSTAD storage; SUNDVIK beds; MAMMUT furniture
- **Bathroom**: GODMORGON, HEMNES vanities; VILTO shelving

### Market Hall Products
- **Textiles**: DVALA, ÄNGSLILJA bedding; VINDUM, STOENSE rugs
- **Cookshop**: IKEA 365+, VARDAGEN cookware; DRAGON cutlery
- **Home Organization**: SKUBB, KUGGIS boxes; RISATORP baskets
- **Lighting**: RANARP, TERTIAL lamps; LEDBERG LED strips
- **Decoration**: FEJKA plants; RIBBA frames; SMYCKA flowers

### Warehouse Products
- **Flat-Pack Furniture**: KALLAX, BILLY, IVAR shelving; PAX, BRIMNES wardrobes
- **Kitchen Systems**: METOD cabinets; MAXIMERA drawers
- **Bedroom Flat-Pack**: SLATTUM, SONGESAND bed frames
- **Seating Flat-Pack**: VEDBO, STRANDMON chairs

## Zone-Based Location System

### Warehouse Zone
- Aisles: 1-30
- Bays: 1-10
- Sections: A, B, C, D
- Stock: 10-100 units per item

### Market Hall Zone
- Aisles: 31-45
- Bays: 1-8
- Section: MH (Market Hall)
- Stock: 50-200 units per item

### Showroom Zone
- Aisles: 46-60
- Bays: 1-5
- Section: SR (Showroom)
- Stock: 1-10 units per item (display items)

## Product Naming

All products follow authentic IKEA naming conventions:
- Swedish words in ALL CAPS (MALM, KALLAX, SÖDERHAMN)
- Realistic product types (Sofa 3-seat, Bookcase, Duvet cover)
- Descriptive details (dimensions, materials, features)

## Pricing

Prices in Swedish Kronor (SEK) following IKEA patterns:
- Small items: 39-499 SEK
- Medium furniture: 599-2,999 SEK
- Large furniture: 3,490-12,990 SEK
- Prices end in 9 or 90 (499, 1299, 2990, etc.)

## Database Schema

The script creates a `products` table with these columns:

| Column | Type | Description |
|--------|------|-------------|
| id | String | Primary key (prod_0001, etc.) |
| article_number | String | IKEA article number (123.456.78) |
| name | String | Product name (BILLY Bookcase) |
| description | String | Product description |
| category | String | Main category (Living Room, etc.) |
| subcategory | String | Subcategory (Textiles, etc.) |
| product_type | String | Specific type (Bookcase, Sofa, etc.) |
| price | Float | Price in SEK |
| currency | String | Currency code (SEK) |
| width_cm | Float | Width in centimeters |
| height_cm | Float | Height in centimeters |
| depth_cm | Float | Depth in centimeters |
| weight_kg | Float | Weight in kilograms |
| zone | String | Store zone (warehouse/market_hall/showroom) |
| aisle | Integer | Aisle number |
| bay | Integer | Bay number |
| section | String | Section identifier |
| stock_quantity | Integer | Current stock level |
| in_stock | Boolean | Whether item is in stock |
| image_url | String | Product image URL |
| tags | JSON | Array of searchable tags |
| colors_available | JSON | Array of available colors |
| assembly_required | Boolean | Whether assembly is needed |

## Output

The script provides detailed progress output:

```
============================================================
🏪 IKEA Product Database Seeder - PostgreSQL Edition
============================================================

🔗 Connecting to PostgreSQL...
   localhost:5432/ikea_products
📋 Creating tables...
   ✅ Tables created

🏗️  Generating products...
  📺 Generating showroom products...
  🛍️  Generating market hall products...
  📦 Generating warehouse products...
  ✅ Generated 200 products total

💾 Inserting 200 products...
   ... 50/200 products inserted
   ... 100/200 products inserted
   ... 150/200 products inserted
   ... 200/200 products inserted
   ✅ All 200 products committed to database

📊 Product Statistics:
   Warehouse: 60 products
   Market Hall: 80 products
   Showroom: 60 products

📁 Products by Category:
   Bathroom: 4
   Bedroom: 8
   Children's: 6
   Dining: 5
   Home Office: 5
   Kitchen: 7
   Living Room: 10
   Market Hall: 80
   Warehouse: 60

💰 Total inventory value: 423,450 SEK
📦 Products in stock: 200/200
📊 Total stock units: 12,450

✅ Database seeding complete!
============================================================
```

## Verification

After running the script, verify the data:

```bash
psql -U postgres -d ikea_products

-- Count products
SELECT COUNT(*) FROM products;

-- Count by zone
SELECT zone, COUNT(*)
FROM products
GROUP BY zone;

-- Sample products
SELECT name, product_type, price, zone, aisle
FROM products
LIMIT 10;

-- Check stock
SELECT
  COUNT(*) as total_products,
  SUM(stock_quantity) as total_stock,
  SUM(price * stock_quantity) as total_value
FROM products;
```

## Troubleshooting

### Connection Errors
```
Error: could not connect to server
```
**Solution**: Ensure PostgreSQL is running and the connection URL is correct.

### Permission Errors
```
Error: permission denied for schema public
```
**Solution**: Grant necessary permissions:
```sql
GRANT ALL ON SCHEMA public TO your_user;
```

### Import Errors
```
Error: No module named 'sqlalchemy'
```
**Solution**: Install dependencies:
```bash
pip install -r scripts/requirements.txt
```

## Notes

- The script drops and recreates the `products` table on each run
- All 200 products are generated fresh with random article numbers and stock levels
- Product data is realistic and follows IKEA conventions
- Stock quantities vary by zone (warehouse: 10-100, market hall: 50-200, showroom: 1-10)
- The script is idempotent - safe to run multiple times

## Integration

To use this data in your application:

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

engine = create_engine('postgresql://postgres:postgres@localhost:5432/ikea_products')
Session = sessionmaker(bind=engine)
session = Session()

# Query products by zone
warehouse_products = session.query(Product).filter(Product.zone == 'warehouse').all()

# Search by name
results = session.query(Product).filter(Product.name.ilike('%BILLY%')).all()

# Get products by category
living_room = session.query(Product).filter(Product.category == 'Living Room').all()
```

## License

This is sample data for development purposes.

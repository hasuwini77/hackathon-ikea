# Quick Start Guide - PostgreSQL Product Seeding

## Installation (30 seconds)

```bash
# Navigate to project root
cd /Users/fredrik/claudeeverything/hackathon-ikea/worktree-offline-first

# Install dependencies
pip install -r scripts/requirements.txt
```

## Database Setup (1 minute)

### Option 1: Local PostgreSQL
```bash
# Create database
createdb ikea_products

# Run seeder
python scripts/seed_postgres.py
```

### Option 2: Docker PostgreSQL
```bash
# Start PostgreSQL
docker run -d \
  --name postgres-ikea \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=ikea_products \
  -p 5432:5432 \
  postgres:15

# Wait 5 seconds for startup
sleep 5

# Run seeder
python scripts/seed_postgres.py
```

### Option 3: Custom Database
```bash
# Set custom connection string
export DATABASE_URL="postgresql://user:password@host:port/database"

# Run seeder
python scripts/seed_postgres.py
```

## Expected Output

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
  ✅ Generated 245 products total

💾 Inserting 245 products...
   ... 50/245 products inserted
   ... 100/245 products inserted
   ... 150/245 products inserted
   ... 200/245 products inserted
   ✅ All 245 products committed to database

📊 Product Statistics:
   Warehouse: 75 products
   Market Hall: 88 products
   Showroom: 82 products

📁 Products by Category:
   Bathroom: 8
   Bedroom: 15
   Children's: 10
   Dining: 10
   Home Office: 12
   Kitchen: 7
   Living Room: 20
   Market Hall: 88
   Warehouse: 75

💰 Total inventory value: 890,245 SEK
📦 Products in stock: 245/245
📊 Total stock units: 16,850

✅ Database seeding complete!
============================================================
```

## Verification

```bash
# Connect to database
psql -U postgres -d ikea_products

# Count products
SELECT COUNT(*) FROM products;
# Expected: 245

# View sample products
SELECT name, product_type, price, zone, aisle
FROM products
LIMIT 10;

# Check distribution by zone
SELECT zone, COUNT(*)
FROM products
GROUP BY zone;
# Expected:
#   warehouse    | 75
#   market_hall  | 88
#   showroom     | 82
```

## Troubleshooting

### "No module named 'sqlalchemy'"
```bash
pip install sqlalchemy psycopg2-binary
```

### "could not connect to server"
Check PostgreSQL is running:
```bash
# Check Docker container
docker ps | grep postgres

# Check local PostgreSQL
pg_isready
```

### "database does not exist"
```bash
createdb ikea_products
# or
psql -U postgres -c "CREATE DATABASE ikea_products;"
```

## What You Get

- **245 realistic IKEA products**
- **82 showroom products** (Living Room, Bedroom, Office, Kitchen, Dining, Children's, Bathroom)
- **88 market hall products** (Textiles, Cookshop, Organization, Lighting, Decoration)
- **75 warehouse products** (Flat-pack furniture with aisle/bay/section locations)
- **Authentic Swedish names** (MALM, KALLAX, SÖDERHAMN, etc.)
- **Realistic pricing** in SEK (Swedish Kronor)
- **Complete dimensions** (width, height, depth, weight)
- **Zone-based locations** (warehouse/market_hall/showroom)
- **Stock quantities** (varies by zone type)

## File Locations

```
/Users/fredrik/claudeeverything/hackathon-ikea/worktree-offline-first/
├── scripts/
│   ├── seed_postgres.py           # Main seeder script
│   ├── requirements.txt           # Python dependencies
│   ├── POSTGRES_SEED_README.md    # Detailed documentation
│   ├── PRODUCT_SUMMARY.md         # Product breakdown
│   └── QUICK_START.md             # This file
```

## Next Steps

After seeding, you can:

1. **Query products by zone**
   ```sql
   SELECT * FROM products WHERE zone = 'warehouse';
   ```

2. **Search by name**
   ```sql
   SELECT * FROM products WHERE name ILIKE '%BILLY%';
   ```

3. **Find products in category**
   ```sql
   SELECT * FROM products WHERE category = 'Living Room';
   ```

4. **Calculate inventory value**
   ```sql
   SELECT SUM(price * stock_quantity) FROM products;
   ```

5. **Export to JSON** (for use in other systems)
   ```bash
   psql -U postgres -d ikea_products -c "
     COPY (SELECT row_to_json(products) FROM products)
     TO '/tmp/products.json'
   "
   ```

## Support

- See `POSTGRES_SEED_README.md` for detailed documentation
- See `PRODUCT_SUMMARY.md` for product breakdown
- Check database schema in `seed_postgres.py`

---

**Time to Complete**: 1-2 minutes
**Products Generated**: 245
**Database Size**: ~500KB

#!/usr/bin/env python3
"""
Seed PostgreSQL database with IKEA products from JSON file.

Usage:
    python scripts/seed_from_json.py

Environment variables:
    DATABASE_URL - PostgreSQL connection string (default: postgresql://localhost/ikea)
"""

import json
import os
import sys
from datetime import datetime
from pathlib import Path

try:
    import psycopg
except ImportError:
    print("Error: psycopg not installed. Run: pip install 'psycopg[binary]'")
    sys.exit(1)

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://localhost/ikea")

# Path to products JSON
SCRIPT_DIR = Path(__file__).parent
PRODUCTS_JSON = SCRIPT_DIR / "data" / "ikea_products.json"


def create_table(conn):
    """Create products table if it doesn't exist."""
    conn.execute("""
        CREATE TABLE IF NOT EXISTS products (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            article_number VARCHAR(20) UNIQUE NOT NULL,
            name VARCHAR(100) NOT NULL,
            description TEXT,
            category VARCHAR(50) NOT NULL,
            subcategory VARCHAR(50),
            product_type VARCHAR(50),
            price DECIMAL(10, 2) NOT NULL,
            currency VARCHAR(3) DEFAULT 'SEK',
            width_cm DECIMAL(6, 1),
            height_cm DECIMAL(6, 1),
            depth_cm DECIMAL(6, 1),
            weight_kg DECIMAL(6, 2),
            zone VARCHAR(50) NOT NULL,
            aisle INTEGER,
            bay INTEGER,
            section VARCHAR(5),
            stock_quantity INTEGER DEFAULT 0,
            stock_last_checked TIMESTAMP DEFAULT NOW(),
            image_url TEXT,
            tags JSONB DEFAULT '[]',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_products_article_number ON products(article_number);
        CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
        CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
        CREATE INDEX IF NOT EXISTS idx_products_zone ON products(zone);
    """)
    conn.commit()
    print("Table 'products' created/verified.")


def load_products():
    """Load products from JSON file."""
    if not PRODUCTS_JSON.exists():
        print(f"Error: Products file not found: {PRODUCTS_JSON}")
        sys.exit(1)

    with open(PRODUCTS_JSON) as f:
        data = json.load(f)

    return data.get("products", [])


def seed_products(conn, products):
    """Insert products into database."""
    inserted = 0
    updated = 0

    for product in products:
        try:
            result = conn.execute("""
                INSERT INTO products (
                    article_number, name, description, category, subcategory,
                    product_type, price, currency, width_cm, height_cm, depth_cm,
                    weight_kg, zone, aisle, bay, section, stock_quantity, tags
                ) VALUES (
                    %(article_number)s, %(name)s, %(description)s, %(category)s, %(subcategory)s,
                    %(product_type)s, %(price)s, 'SEK', %(width_cm)s, %(height_cm)s, %(depth_cm)s,
                    %(weight_kg)s, %(zone)s, %(aisle)s, %(bay)s, %(section)s, %(stock_quantity)s, %(tags)s
                )
                ON CONFLICT (article_number) DO UPDATE SET
                    name = EXCLUDED.name,
                    description = EXCLUDED.description,
                    category = EXCLUDED.category,
                    subcategory = EXCLUDED.subcategory,
                    product_type = EXCLUDED.product_type,
                    price = EXCLUDED.price,
                    width_cm = EXCLUDED.width_cm,
                    height_cm = EXCLUDED.height_cm,
                    depth_cm = EXCLUDED.depth_cm,
                    weight_kg = EXCLUDED.weight_kg,
                    zone = EXCLUDED.zone,
                    aisle = EXCLUDED.aisle,
                    bay = EXCLUDED.bay,
                    section = EXCLUDED.section,
                    stock_quantity = EXCLUDED.stock_quantity,
                    tags = EXCLUDED.tags,
                    updated_at = NOW()
                RETURNING (xmax = 0) AS inserted
            """, {
                "article_number": product["article_number"],
                "name": product["name"],
                "description": product.get("description", ""),
                "category": product["category"],
                "subcategory": product.get("subcategory", ""),
                "product_type": product.get("product_type", ""),
                "price": product["price"],
                "width_cm": product.get("width_cm"),
                "height_cm": product.get("height_cm"),
                "depth_cm": product.get("depth_cm"),
                "weight_kg": product.get("weight_kg"),
                "zone": product["zone"],
                "aisle": product.get("aisle"),
                "bay": product.get("bay"),
                "section": product.get("section"),
                "stock_quantity": product.get("stock_quantity", 0),
                "tags": json.dumps(product.get("tags", []))
            })

            row = result.fetchone()
            if row and row[0]:
                inserted += 1
            else:
                updated += 1

        except Exception as e:
            print(f"Error inserting {product['article_number']}: {e}")
            continue

    conn.commit()
    return inserted, updated


def main():
    print(f"Connecting to: {DATABASE_URL}")

    try:
        with psycopg.connect(DATABASE_URL) as conn:
            create_table(conn)

            products = load_products()
            print(f"Loaded {len(products)} products from JSON")

            inserted, updated = seed_products(conn, products)
            print(f"\nResults:")
            print(f"  Inserted: {inserted}")
            print(f"  Updated:  {updated}")
            print(f"  Total:    {inserted + updated}")

            result = conn.execute("SELECT COUNT(*) FROM products")
            total = result.fetchone()[0]
            print(f"\nTotal products in database: {total}")

            print("\nCategory breakdown:")
            result = conn.execute("""
                SELECT category, COUNT(*) as count
                FROM products
                GROUP BY category
                ORDER BY count DESC
            """)
            for row in result:
                print(f"  {row[0]}: {row[1]}")

    except psycopg.OperationalError as e:
        print(f"Database connection error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()

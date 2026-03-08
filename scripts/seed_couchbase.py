#!/usr/bin/env python3
"""
Seed Couchbase Edge Server with IKEA product data.

Loads products from generated JSON file and inserts/updates them
in Couchbase Edge Server using the REST API.
"""

import json
import os
import random
import sys
import requests
from typing import List, Dict


# Couchbase Edge Server configuration
# Override with env vars when targeting containerized stacks.
COUCHBASE_URL = os.getenv("COUCHBASE_URL", "http://127.0.0.1:59840")
DATABASE_NAME = os.getenv("COUCHBASE_DB", "ikea_products")
PRODUCTS_FILE = os.getenv("COUCHBASE_PRODUCTS_FILE")


def load_products(filepath: str) -> List[Dict]:
    """Load products from JSON file"""
    if not os.path.exists(filepath):
        print(f"Error: Product file not found: {filepath}")
        print("Please run 'python scripts/generate_products.py' first")
        sys.exit(1)

    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Handle both formats: direct array or {"products": [...]}
    if isinstance(data, dict) and 'products' in data:
        products = data['products']
    elif isinstance(data, list):
        products = data
    else:
        print(f"Error: Unexpected JSON format in {filepath}")
        sys.exit(1)

    print(f"Loaded {len(products)} products from {filepath}")
    return products


def check_server_connection() -> bool:
    """Check if Couchbase Edge Server is running"""
    try:
        response = requests.get(f"{COUCHBASE_URL}/", timeout=5)
        print(f"Couchbase Edge Server is running (status: {response.status_code})")
        return True
    except requests.exceptions.RequestException as e:
        print(f"Error: Cannot connect to Couchbase Edge Server at {COUCHBASE_URL}")
        print(f"Details: {e}")
        print("\nPlease ensure Couchbase Edge Server is running.")
        return False


def create_database() -> bool:
    """Create database if it doesn't exist"""
    try:
        # Check if database exists
        response = requests.get(f"{COUCHBASE_URL}/{DATABASE_NAME}", timeout=5)
        if response.status_code == 200:
            print(f"Database '{DATABASE_NAME}' already exists")
            return True
    except requests.exceptions.RequestException:
        pass

    # Create database
    try:
        response = requests.put(f"{COUCHBASE_URL}/{DATABASE_NAME}", timeout=5)
        if response.status_code in [200, 201]:
            print(f"Database '{DATABASE_NAME}' created successfully")
            return True
        else:
            print(f"Failed to create database: {response.status_code} - {response.text}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"Error creating database: {e}")
        return False


def transform_product(product: Dict) -> Dict:
    """Transform product from generated format to Couchbase document format"""
    # Use article_number as the document ID with 'product:' prefix
    doc_id = f"product:{product['article_number']}"

    # Build the document with proper field names and structure
    doc = {
        '_id': doc_id,
        'type': 'product',  # Document type for easier querying
        'articleNumber': product['article_number'],
        'name': product['name'],
        'category': product['category'],
        'price': product['price'],
        'currency': product.get('currency', 'SEK'),
    }

    # Optional fields with proper transformations
    if 'description' in product:
        doc['description'] = product['description']

    if 'subcategory' in product:
        doc['subcategory'] = product['subcategory']

    if 'product_type' in product:
        doc['productType'] = product['product_type']

    # Transform dimensions if present
    if 'width_cm' in product or 'height_cm' in product or 'depth_cm' in product:
        doc['dimensions'] = {
            'width': product.get('width_cm'),
            'height': product.get('height_cm'),
            'depth': product.get('depth_cm'),
            'unit': 'cm',
        }

    if 'weight_kg' in product:
        doc['weight'] = {
            'value': product['weight_kg'],
            'unit': 'kg'
        }

    # Transform location information
    if 'zone' in product:
        doc['zone'] = product['zone']
    if 'aisle' in product:
        doc['aisle'] = product['aisle']
    if 'bay' in product:
        doc['bay'] = product['bay']
    if 'section' in product:
        doc['section'] = product['section']

    # Transform stock information
    if 'stock_quantity' in product:
        location_str = "warehouse"
        if 'zone' in product:
            location_str = product['zone']
            if 'aisle' in product and 'bay' in product and 'section' in product:
                location_str = f"{product['zone']}-{product['aisle']}-{product['bay']}-{product['section']}"

        doc['stock'] = {
            'quantity': product['stock_quantity'],
            'location': location_str,
        }
        doc['inStock'] = product['stock_quantity'] > 0

    # Include tags if available
    if 'tags' in product:
        doc['tags'] = product['tags']
    elif 'product_type' in product:
        doc['tags'] = [product['product_type']]

    # Add images array (empty for now, can be populated later)
    if 'images' in product:
        doc['images'] = product['images']

    # Add last updated timestamp
    from datetime import datetime, timezone
    doc['lastUpdated'] = datetime.now(timezone.utc).isoformat()

    return doc


def insert_product(product: Dict) -> bool:
    """Insert or update a product in Couchbase"""
    # Transform product to Couchbase document format
    doc = transform_product(product)
    doc_id = doc['_id']
    url = f"{COUCHBASE_URL}/{DATABASE_NAME}/{doc_id}"

    try:
        # Try to get existing document to get its revision
        response = requests.get(url, timeout=5)

        if response.status_code == 200:
            # Document exists, get revision for update
            existing_doc = response.json()
            rev = existing_doc.get('_rev')
            doc['_rev'] = rev

        # Insert or update document
        response = requests.put(
            url,
            json=doc,
            headers={'Content-Type': 'application/json'},
            timeout=5
        )

        if response.status_code in [200, 201]:
            return True
        else:
            print(f"Failed to insert {doc_id}: {response.status_code} - {response.text}")
            return False

    except requests.exceptions.RequestException as e:
        print(f"Error inserting {doc_id}: {e}")
        return False


def seed_products(products: List[Dict]) -> Dict[str, int]:
    """Seed all products into Couchbase"""
    stats = {
        'success': 0,
        'failed': 0,
        'total': len(products)
    }

    print(f"\nSeeding {len(products)} products into Couchbase...")

    for i, product in enumerate(products, 1):
        # Remove _rev if it exists in source data
        product.pop('_rev', None)

        if insert_product(product):
            stats['success'] += 1
        else:
            stats['failed'] += 1

        # Progress indicator
        if i % 20 == 0 or i == len(products):
            print(f"  Progress: {i}/{len(products)} products processed "
                  f"({stats['success']} success, {stats['failed']} failed)")

    return stats


def verify_seeding() -> Dict:
    """Verify products were seeded correctly"""
    try:
        # Get all documents
        response = requests.get(
            f"{COUCHBASE_URL}/{DATABASE_NAME}/_all_docs",
            timeout=5
        )

        if response.status_code == 200:
            data = response.json()
            total_rows = data.get('total_rows', 0)
            print(f"\nVerification: {total_rows} documents found in database")
            return {'total_rows': total_rows}
        else:
            print(f"Failed to verify: {response.status_code}")
            return {}

    except requests.exceptions.RequestException as e:
        print(f"Error during verification: {e}")
        return {}


def print_sample_products(count: int = 5):
    """Print sample products from the database"""
    try:
        response = requests.get(
            f"{COUCHBASE_URL}/{DATABASE_NAME}/_all_docs",
            params={'include_docs': 'true', 'limit': count},
            timeout=5
        )

        if response.status_code == 200:
            data = response.json()
            rows = data.get('rows', [])

            print(f"\nSample products ({len(rows)} shown):")
            for row in rows:
                doc = row.get('doc', {})
                # Get stock quantity from nested structure
                stock_qty = 0
                if isinstance(doc.get('stock'), dict):
                    stock_qty = doc['stock'].get('quantity', 0)
                elif isinstance(doc.get('stock'), int):
                    stock_qty = doc.get('stock', 0)

                print(f"  - {doc.get('name', 'Unknown')} "
                      f"({doc.get('articleNumber', 'N/A')}) - "
                      f"{doc.get('price', 0)} {doc.get('currency', 'SEK')} - "
                      f"Stock: {stock_qty}")
    except requests.exceptions.RequestException as e:
        print(f"Error fetching sample products: {e}")


def main():
    """Main entry point"""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    products_file = PRODUCTS_FILE or os.path.join(script_dir, 'data', 'ikea_products.json')

    print("=" * 60)
    print("IKEA Product Database Seeder")
    print("=" * 60)
    print(f"Target Edge Server: {COUCHBASE_URL}")
    print(f"Target Database: {DATABASE_NAME}")

    # Check server connection
    if not check_server_connection():
        sys.exit(1)

    # Create database
    if not create_database():
        sys.exit(1)

    # Load products
    products = load_products(products_file)

    # Seed products
    stats = seed_products(products)

    # Print results
    print("\n" + "=" * 60)
    print("Seeding Results:")
    print("=" * 60)
    print(f"  Total products: {stats['total']}")
    print(f"  Successfully inserted/updated: {stats['success']}")
    print(f"  Failed: {stats['failed']}")
    print(f"  Success rate: {(stats['success']/stats['total']*100):.1f}%")

    # Verify
    verify_seeding()

    # Show samples
    print_sample_products(5)

    print("\n" + "=" * 60)
    print("Done!")
    print("=" * 60)
    print(f"\nDatabase URL: {COUCHBASE_URL}/{DATABASE_NAME}")
    print(f"View all docs: {COUCHBASE_URL}/{DATABASE_NAME}/_all_docs")


if __name__ == '__main__':
    main()

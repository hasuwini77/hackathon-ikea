#!/usr/bin/env python3
"""
Test script to verify the product transformation logic.
Demonstrates the transformation from generated format to Couchbase document format.
"""

import json
import sys
import os
from datetime import datetime, timezone
from typing import Dict, List

# Add the script directory to path
script_dir = os.path.dirname(os.path.abspath(__file__))


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
        'currency': product['currency'],
    }

    # Optional fields with proper transformations
    if 'description' in product:
        doc['description'] = product['description']

    # Transform dimensions if present
    if 'dimensions' in product:
        doc['dimensions'] = {
            'width': product['dimensions'].get('width'),
            'height': product['dimensions'].get('height'),
            'depth': product['dimensions'].get('depth') or product['dimensions'].get('length'),
            'unit': product['dimensions'].get('unit', 'cm'),
        }

    # Transform stock information
    if 'stock' in product:
        doc['stock'] = {
            'quantity': product['stock'],
        }
        if 'store_location' in product and 'section' in product['store_location']:
            doc['stock']['location'] = product['store_location']['section']

    # Include tags if available, otherwise create from product_type
    if 'colors_available' in product:
        doc['tags'] = product['colors_available']
    elif 'product_type' in product:
        doc['tags'] = [product['product_type']]

    # Add images array (empty for now, can be populated later)
    if 'images' in product:
        doc['images'] = product['images']

    # Add last updated timestamp
    doc['lastUpdated'] = datetime.now(timezone.utc).isoformat()

    return doc


def main():
    """Test transformation with sample data"""
    products_file = os.path.join(script_dir, 'data', 'products.json')

    if not os.path.exists(products_file):
        print(f"Error: {products_file} not found")
        print("Please run 'python scripts/generate_products.py' first")
        sys.exit(1)

    # Load products
    with open(products_file, 'r', encoding='utf-8') as f:
        products = json.load(f)

    print("=" * 70)
    print("Product Transformation Test")
    print("=" * 70)
    print(f"\nLoaded {len(products)} products")

    # Test transformation on first 3 products
    test_count = min(3, len(products))
    print(f"\nTransforming first {test_count} products as examples:\n")

    for i, product in enumerate(products[:test_count], 1):
        transformed = transform_product(product)

        print(f"\n{'-' * 70}")
        print(f"Product {i}:")
        print(f"{'-' * 70}")

        print(f"\nOriginal format:")
        print(f"  id: {product.get('id')}")
        print(f"  article_number: {product.get('article_number')}")
        print(f"  name: {product.get('name')}")
        print(f"  stock: {product.get('stock')}")

        print(f"\nTransformed to Couchbase format:")
        print(f"  _id: {transformed.get('_id')}")
        print(f"  type: {transformed.get('type')}")
        print(f"  articleNumber: {transformed.get('articleNumber')}")
        print(f"  name: {transformed.get('name')}")
        print(f"  category: {transformed.get('category')}")
        print(f"  price: {transformed.get('price')} {transformed.get('currency')}")
        print(f"  stock: {transformed.get('stock')}")
        print(f"  dimensions: {transformed.get('dimensions')}")
        print(f"  tags: {transformed.get('tags')}")
        print(f"  lastUpdated: {transformed.get('lastUpdated')}")

    # Verify all products can be transformed
    print(f"\n\n{'=' * 70}")
    print("Transformation Validation")
    print("=" * 70)

    success_count = 0
    failed_products = []

    for product in products:
        try:
            transformed = transform_product(product)
            # Verify required fields
            if '_id' in transformed and 'type' in transformed and 'articleNumber' in transformed:
                success_count += 1
            else:
                failed_products.append(product.get('article_number', 'unknown'))
        except Exception as e:
            failed_products.append(f"{product.get('article_number', 'unknown')} (error: {str(e)})")

    print(f"\nTotal products: {len(products)}")
    print(f"Successfully transformed: {success_count}")
    print(f"Failed: {len(failed_products)}")

    if failed_products:
        print(f"\nFailed products:")
        for article in failed_products[:10]:  # Show first 10 failures
            print(f"  - {article}")

    if success_count == len(products):
        print("\nStatus: SUCCESS - All products can be transformed correctly!")
    else:
        print(f"\nStatus: FAILED - {len(failed_products)} products could not be transformed")
        sys.exit(1)

    print("=" * 70)


if __name__ == '__main__':
    main()

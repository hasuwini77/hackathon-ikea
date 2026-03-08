#!/usr/bin/env python3
"""
Generate realistic IKEA product dataset with authentic Swedish names,
categories, and product information.
"""

import json
import random
import os
from typing import List, Dict


# Authentic IKEA product names organized by type
IKEA_NAMES = {
    'furniture': [
        'KALLAX', 'MALM', 'BILLY', 'HEMNES', 'BESTÅ', 'EKTORP', 'KIVIK',
        'PAX', 'POÄNG', 'IVAR', 'LISABO', 'RÅSKOG', 'NORDLI', 'HAUGA',
        'IDANÄS', 'FRIHETEN', 'SÖDERHAMN', 'VIMLE', 'STUVA', 'PLATSA'
    ],
    'storage': [
        'SKUBB', 'DRONA', 'KUGGIS', 'FJÄLLA', 'SAMMANHANG', 'GLIS',
        'VARIERA', 'RATIONELL', 'TROFAST', 'BYGEL', 'ANTONIUS'
    ],
    'decoration': [
        'FEJKA', 'SMYCKA', 'GRADVIS', 'VINDKAST', 'TVILLING', 'KNOPPÄNG',
        'IKEA PS', 'SANELA', 'MAJGULL', 'ELDTÖREL', 'VINTER'
    ],
    'lighting': [
        'RANARP', 'HEKTAR', 'NÄVLINGE', 'LERSTA', 'YPPERLIG', 'TÄRNABY',
        'INGARED', 'REGOLIT', 'HOLMÖ', 'FADO'
    ],
    'kitchen': [
        'VARDAGEN', 'OFTAST', 'IKEA 365+', 'STÄM', 'MIXTUR', 'FINMAT',
        'TILLREDA', 'RINNIG', 'KONCIS', 'LÄTTÖL'
    ],
    'textile': [
        'LACK', 'GURLI', 'KRATTEN', 'TRÅDKLÖVER', 'SKOGSKLÖVER', 'VIGDIS',
        'LEIKNY', 'ÖRTSTARR', 'SKÄGGÖRT', 'KUNGSBLOMMA'
    ],
    'kids': [
        'MAMMUT', 'FLISAT', 'BUSUNGE', 'KRITTER', 'DUNDRA', 'MÅLA',
        'SAGOSKATT', 'LATTJO', 'LUSTIGT', 'BLÅVINGAD'
    ]
}

# Product type definitions with realistic descriptions
PRODUCT_TYPES = {
    'Living Room': [
        ('Sofa, 3-seat', 1500, 8000),
        ('Sofa, 2-seat', 1000, 5000),
        ('Coffee table', 300, 2000),
        ('TV bench', 400, 3000),
        ('Armchair', 800, 4000),
        ('Bookcase', 400, 2500),
        ('Side table', 200, 800),
        ('Floor lamp', 300, 1200),
        ('Table lamp', 150, 600),
        ('Cushion cover', 50, 300),
        ('Rug', 400, 3000),
        ('Curtains, 1 pair', 200, 800),
        ('Storage unit', 500, 4000),
        ('Media storage', 300, 1500),
        ('Ottoman', 400, 1500),
    ],
    'Bedroom': [
        ('Bed frame', 1200, 6000),
        ('Wardrobe', 1500, 8000),
        ('Chest of 6 drawers', 600, 2500),
        ('Nightstand', 300, 1200),
        ('Mattress', 800, 5000),
        ('Duvet cover and pillowcase', 200, 800),
        ('Bed linen set', 300, 1000),
        ('Pillow', 100, 500),
        ('Mirror', 200, 1500),
        ('Table lamp', 150, 600),
        ('Clothes rack', 200, 800),
        ('Storage box', 50, 300),
        ('Blackout curtains', 300, 1000),
        ('Bedside table', 250, 900),
    ],
    'Kitchen': [
        ('Dining table', 800, 4000),
        ('Chair', 200, 1200),
        ('Bar stool', 300, 1000),
        ('Kitchen cart', 400, 1500),
        ('Food container, set of 3', 50, 200),
        ('Cookware set, 5 pieces', 300, 1500),
        ('Cutlery, 24-piece', 150, 600),
        ('Dinnerware set, 18-piece', 200, 800),
        ('Glass, set of 6', 40, 150),
        ('Pot with lid', 100, 400),
        ('Frying pan', 150, 500),
        ('Knife set, 3-piece', 100, 400),
        ('Mixing bowl set', 80, 250),
        ('Kitchen organizer', 60, 200),
    ],
    'Bathroom': [
        ('Mirror cabinet', 400, 2000),
        ('Wash-stand with 2 drawers', 800, 3000),
        ('Towel rack', 100, 400),
        ('Bathroom shelf unit', 200, 800),
        ('Bath towel', 50, 200),
        ('Hand towel', 30, 100),
        ('Bathmat', 80, 300),
        ('Soap dispenser', 30, 100),
        ('Toilet brush', 40, 120),
        ('Storage box with lid', 60, 200),
        ('Wall shelf', 100, 400),
        ('Mirror', 150, 600),
    ],
    'Office': [
        ('Desk', 600, 3000),
        ('Office chair', 400, 2500),
        ('Drawer unit on castors', 300, 1200),
        ('Bookcase', 400, 2000),
        ('Cable management box', 60, 150),
        ('Desk organizer', 40, 150),
        ('Lamp', 200, 800),
        ('Desk pad', 80, 200),
        ('Letter tray', 40, 120),
        ('Filing cabinet', 400, 1500),
        ('Monitor stand', 150, 500),
        ('Footrest', 100, 300),
    ],
    'Outdoor': [
        ('Table, outdoor', 500, 2500),
        ('Chair, outdoor', 200, 800),
        ('Sun lounger', 400, 1500),
        ('Parasol', 300, 1200),
        ('Plant pot', 50, 300),
        ('Watering can', 40, 150),
        ('Storage bench, outdoor', 600, 2000),
        ('String light, 12 bulbs', 150, 500),
        ('Outdoor cushion', 100, 350),
        ('Blanket, outdoor', 200, 600),
    ],
    'Kids': [
        ('Children\'s bed', 600, 2500),
        ('Children\'s desk', 400, 1500),
        ('Children\'s chair', 100, 400),
        ('Toy storage', 200, 800),
        ('Children\'s wardrobe', 600, 2000),
        ('Play kitchen', 500, 1500),
        ('Stuffed toy', 50, 200),
        ('Children\'s table', 300, 1000),
        ('Step stool', 80, 250),
        ('Blackboard', 100, 400),
        ('Drawing paper roll', 40, 120),
    ],
    'Storage': [
        ('Shelf unit', 300, 2000),
        ('Storage box with lid', 50, 250),
        ('Basket', 60, 300),
        ('Storage combination', 800, 5000),
        ('Wall shelf', 100, 500),
        ('Shoe cabinet', 400, 1800),
        ('Coat rack', 150, 600),
        ('Storage stool', 200, 700),
        ('Magazine file, set of 5', 50, 150),
        ('Hanging storage', 100, 400),
        ('Drawer organizer', 40, 150),
    ]
}

# IKEA-style product descriptions
DESCRIPTION_TEMPLATES = {
    'furniture': [
        'Scandinavian design meets functionality. {features}',
        'Simple, modern design with clean lines. {features}',
        'Timeless design that fits any home. {features}',
        'Practical and stylish. {features}',
        'Durable and easy to assemble. {features}',
    ],
    'features': [
        'Easy to clean and maintain.',
        'Made from sustainable materials.',
        'Adjustable feet for stability on uneven floors.',
        'Can be placed anywhere in the room.',
        'Matches well with other furniture in the series.',
        'Space-saving design.',
        'Designed to be used for years to come.',
        'Good to know: wipe clean with a damp cloth.',
        'Renewable material (wood).',
        'Easy to assemble - no tools required.',
    ]
}


def generate_article_number() -> str:
    """Generate realistic IKEA article number (format: XXX.XXX.XX)"""
    return f"{random.randint(100, 999)}.{random.randint(100, 999)}.{random.randint(10, 99)}"


def generate_description() -> str:
    """Generate IKEA-style product description"""
    template = random.choice(DESCRIPTION_TEMPLATES['furniture'])
    features = ' '.join(random.sample(DESCRIPTION_TEMPLATES['features'], k=random.randint(2, 4)))
    return template.format(features=features)


def get_store_location(category: str) -> Dict[str, any]:
    """Generate realistic store location based on category"""
    category_sections = {
        'Living Room': (1, 8),
        'Bedroom': (9, 14),
        'Kitchen': (15, 18),
        'Bathroom': (19, 21),
        'Office': (22, 24),
        'Outdoor': (25, 26),
        'Kids': (27, 28),
        'Storage': (1, 30),  # Storage items throughout
    }

    aisle_range = category_sections.get(category, (1, 30))
    aisle = random.randint(aisle_range[0], aisle_range[1])
    bay = random.randint(1, 10)
    section = random.choice(['A', 'B', 'C', 'D'])

    return {
        'aisle': aisle,
        'bay': bay,
        'section': section  # Now stores letter (A-D) instead of category name
    }


def generate_product(product_id: int, category: str, product_info: tuple) -> Dict:
    """Generate a single realistic IKEA product"""
    product_type, min_price, max_price = product_info

    # Select appropriate name category
    if category in ['Living Room', 'Bedroom', 'Office']:
        name_pool = IKEA_NAMES['furniture']
    elif category == 'Storage':
        name_pool = IKEA_NAMES['storage'] + IKEA_NAMES['furniture']
    elif category == 'Kitchen':
        name_pool = IKEA_NAMES['kitchen']
    elif category == 'Kids':
        name_pool = IKEA_NAMES['kids']
    else:
        name_pool = IKEA_NAMES['furniture'] + IKEA_NAMES['decoration']

    base_name = random.choice(name_pool)

    # Create product name with type
    name = f"{base_name} {product_type}"

    # Generate price (in SEK - Swedish Krona)
    price = random.randint(min_price, max_price)
    # Round to nearest 5 SEK (IKEA pricing pattern)
    price = round(price / 5) * 5

    product = {
        'id': f'prod_{product_id:04d}',
        'article_number': generate_article_number(),
        'name': name,
        'category': category,
        'product_type': product_type,
        'price': price,
        'currency': 'SEK',
        'stock': random.randint(0, 100),
        'store_location': get_store_location(category),
        'description': generate_description(),
        'dimensions': {
            'length': random.randint(20, 200),
            'width': random.randint(20, 150),
            'height': random.randint(10, 100),
            'unit': 'cm'
        },
        'weight': round(random.uniform(0.5, 50.0), 1),
        'colors_available': random.sample(
            ['White', 'Black', 'Brown', 'Grey', 'Beige', 'Blue', 'Natural'],
            k=random.randint(1, 3)
        ),
        'assembly_required': random.choice([True, True, True, False]),  # Most require assembly
        'in_stock': None  # Will be set based on stock level
    }

    # Set in_stock based on stock level
    product['in_stock'] = product['stock'] > 0

    return product


def generate_products(count: int = 200) -> List[Dict]:
    """Generate specified number of realistic IKEA products"""
    products = []
    product_id = 1

    # Calculate products per category
    categories = list(PRODUCT_TYPES.keys())
    products_per_category = count // len(categories)

    for category in categories:
        product_types = PRODUCT_TYPES[category]

        for _ in range(products_per_category):
            product_info = random.choice(product_types)
            product = generate_product(product_id, category, product_info)
            products.append(product)
            product_id += 1

    # Fill remaining products if needed
    while len(products) < count:
        category = random.choice(categories)
        product_info = random.choice(PRODUCT_TYPES[category])
        product = generate_product(product_id, category, product_info)
        products.append(product)
        product_id += 1

    return products


def save_products(products: List[Dict], filepath: str):
    """Save products to JSON file"""
    os.makedirs(os.path.dirname(filepath), exist_ok=True)

    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(products, f, indent=2, ensure_ascii=False)

    print(f"Generated {len(products)} products")
    print(f"Saved to: {filepath}")

    # Print statistics
    print("\nProduct Statistics:")
    categories = {}
    total_value = 0
    in_stock_count = 0

    for product in products:
        category = product['category']
        categories[category] = categories.get(category, 0) + 1
        total_value += product['price']
        if product['in_stock']:
            in_stock_count += 1

    print(f"  Total products: {len(products)}")
    print(f"  Products in stock: {in_stock_count}")
    print(f"  Total inventory value: {total_value:,} SEK")
    print(f"\n  Products by category:")
    for category, count in sorted(categories.items()):
        print(f"    {category}: {count}")


def main():
    """Main entry point"""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    output_file = os.path.join(script_dir, 'data', 'products.json')

    print("Generating IKEA product dataset...")
    products = generate_products(count=220)  # Generate 220 products

    save_products(products, output_file)
    print("\nDone!")


if __name__ == '__main__':
    main()

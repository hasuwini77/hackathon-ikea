#!/usr/bin/env python3
"""
Seed PostgreSQL with 200 realistic IKEA products.

This script generates products across showroom, market hall, and warehouse zones
with authentic Swedish-style names and realistic IKEA pricing.

Usage:
    python scripts/seed_postgres.py

Environment Variables:
    DATABASE_URL - PostgreSQL connection string (default: postgresql://postgres:postgres@localhost:5432/ikea_products)
"""

import os
import sys
import random
from typing import List, Dict, Optional
from datetime import datetime

# Add models to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'models', 'python'))

try:
    from sqlalchemy import create_engine, Column, String, Float, Integer, Boolean, JSON
    from sqlalchemy.ext.declarative import declarative_base
    from sqlalchemy.orm import sessionmaker, Session
    print("✅ SQLAlchemy imported successfully")
except ImportError:
    print("❌ Error: SQLAlchemy not installed. Run: pip install sqlalchemy psycopg2-binary")
    sys.exit(1)


# Database setup
Base = declarative_base()


class Product(Base):
    """PostgreSQL Product model"""
    __tablename__ = 'products'

    id = Column(String, primary_key=True)
    article_number = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    description = Column(String)
    category = Column(String, nullable=False, index=True)
    subcategory = Column(String)
    product_type = Column(String, nullable=False)
    price = Column(Float, nullable=False)
    currency = Column(String, default='SEK')

    # Dimensions
    width_cm = Column(Float)
    height_cm = Column(Float)
    depth_cm = Column(Float)
    weight_kg = Column(Float)

    # Location (zone-based system)
    zone = Column(String, nullable=False, index=True)  # 'warehouse', 'market_hall', 'showroom'
    aisle = Column(Integer)
    bay = Column(Integer)
    section = Column(String)

    # Stock
    stock_quantity = Column(Integer, default=0)
    in_stock = Column(Boolean, default=True)

    # Additional fields
    image_url = Column(String)
    tags = Column(JSON)  # Array of tags
    colors_available = Column(JSON)  # Array of colors
    assembly_required = Column(Boolean, default=True)


# IKEA Product Data - Swedish-style names and realistic categories

SHOWROOM_PRODUCTS = {
    'Living Room': [
        ('SÖDERHAMN', 'Sofa, 3-seat', 'Modular sofa with deep seats', 8990, 230, 99, 151, 35),
        ('KIVIK', 'Sofa, 2-seat', 'Spacious sofa with soft comfort', 6990, 190, 95, 124, 30),
        ('LANDSKRONA', 'Sofa, 3-seat', 'Leather sofa with metal legs', 12990, 204, 89, 158, 45),
        ('VIMLE', 'Sofa, 4-seat', 'Large family sofa with chaise', 9990, 281, 98, 164, 52),
        ('EKTORP', 'Sofa, 3-seat', 'Classic design with comfortable seat', 7990, 218, 88, 103, 38),
        ('FRIHETEN', 'Sleeper sofa, 3-seat', 'Sofa bed with storage', 5990, 225, 102, 151, 68),
        ('LACK', 'Coffee table', 'Simple and practical design', 499, 90, 45, 55, 5),
        ('LIATORP', 'Coffee table', 'Traditional style with glass top', 2499, 93, 51, 93, 25),
        ('STOCKHOLM', 'Coffee table', 'Walnut veneer, elegant design', 4990, 180, 50, 100, 32),
        ('BESTÅ', 'TV bench', 'Modern TV storage combination', 3990, 180, 42, 40, 28),
        ('BRIMNES', 'TV bench', 'With storage and cable management', 2499, 120, 53, 41, 24),
        ('EKTORP', 'Armchair', 'Classic design with comfortable seat', 3990, 103, 88, 88, 22),
        ('POÄNG', 'Armchair', 'Layer-glued bent birch frame', 1299, 68, 100, 82, 8),
        ('STRANDMON', 'Wing chair', 'Traditional style wing chair', 3499, 82, 101, 96, 22),
        ('BILLY', 'Bookcase', 'Simple, practical storage', 699, 80, 202, 28, 30),
        ('HEMNES', 'Bookcase', 'Solid wood with traditional style', 2499, 90, 198, 37, 42),
        ('KALLAX', 'Shelf unit, 4x4', 'Versatile 16-cube storage', 1299, 147, 147, 39, 32),
        ('LACK', 'Side table', 'Easy to move around', 199, 55, 45, 55, 3),
        ('GLADOM', 'Tray table', 'Removable tray for serving', 199, 45, 53, 45, 2.5),
        ('LISABO', 'Side table', 'Ash veneer with natural feel', 899, 45, 45, 50, 6),
    ],
    'Bedroom': [
        ('MALM', 'Bed frame', 'Adjustable bed sides for mattress', 2499, 209, 106, 234, 38),
        ('HEMNES', 'Bed frame', 'Solid wood with traditional design', 4990, 211, 66, 235, 52),
        ('TARVA', 'Bed frame', 'Untreated solid pine', 1999, 206, 97, 212, 28),
        ('SLATTUM', 'Upholstered bed frame', 'Soft padded headboard', 2999, 157, 104, 235, 42),
        ('IDANÄS', 'Bed frame', 'Traditional design with storage', 5990, 168, 132, 218, 58),
        ('PAX', 'Wardrobe frame', 'Frame with sliding doors', 8990, 200, 236, 66, 85),
        ('BRIMNES', 'Wardrobe', '3-door wardrobe with mirror', 3999, 117, 190, 50, 58),
        ('NORDLI', 'Chest of 6 drawers', 'Modular storage system', 2999, 120, 97, 47, 35),
        ('MALM', 'Chest of 4 drawers', 'Smooth-running drawers', 1999, 80, 100, 48, 28),
        ('HEMNES', 'Chest of 8 drawers', 'Made of solid wood', 3999, 160, 96, 50, 52),
        ('HEMNES', 'Nightstand', 'Made of solid wood', 899, 46, 61, 35, 12),
        ('MALM', 'Nightstand', 'Two drawers with glass top', 699, 40, 55, 48, 8),
        ('SONGESAND', 'Wardrobe', 'Traditional style with sliding doors', 3990, 120, 191, 60, 48),
        ('KULLEN', 'Chest of 3 drawers', 'Affordable bedroom storage', 799, 70, 72, 40, 18),
        ('NORDKISA', 'Nightstand', 'Natural bamboo construction', 599, 40, 60, 40, 6),
    ],
    'Home Office': [
        ('BEKANT', 'Desk', 'Work surface with electric height adjust', 5990, 160, 80, 65, 42),
        ('BEKANT', 'Desk corner', 'Left corner desk', 6990, 160, 110, 65, 52),
        ('MICKE', 'Desk', 'Compact desk with integrated storage', 1299, 105, 75, 50, 18),
        ('THYGE', 'Desk', 'Adjustable height desk', 2499, 160, 80, 65, 28),
        ('LISABO', 'Desk', 'Ash veneer desktop', 2499, 118, 74, 50, 24),
        ('MALM', 'Desk', 'Smooth-running drawer', 1999, 140, 73, 65, 32),
        ('MARKUS', 'Office chair', 'High backrest for neck support', 1999, 62, 140, 60, 14),
        ('JÄRVFJÄLLET', 'Office chair', 'Ergonomic design with armrests', 3490, 68, 140, 68, 16),
        ('HATTEFJÄLL', 'Office chair', 'With armrests and tilt function', 2499, 68, 114, 68, 12),
        ('ALEX', 'Drawer unit', 'Practical storage on castors', 1499, 36, 70, 58, 22),
        ('HELMER', 'Drawer unit on castors', 'With 6 compartments', 599, 28, 69, 43, 8),
        ('BILLY', 'Bookcase with doors', 'Glass doors protect contents', 1999, 80, 202, 30, 36),
    ],
    'Kitchen': [
        ('METOD', 'Base cabinet frame', 'Sturdy frame construction', 1299, 80, 80, 60, 18),
        ('METOD', 'Wall cabinet frame', 'Frame for wall mounting', 999, 80, 80, 40, 12),
        ('METOD', 'High cabinet frame', 'Tall pantry cabinet frame', 2499, 60, 200, 60, 28),
        ('VOXTORP', 'Door', 'Matt walnut effect', 599, 60, 80, 2, 4),
        ('RINGHULT', 'Door', 'High-gloss white', 899, 60, 80, 2, 4.5),
        ('BODBYN', 'Door', 'Off-white traditional style', 799, 60, 80, 2, 4.2),
        ('KNOXHULT', 'Kitchen', 'Complete compact kitchen', 8990, 180, 220, 61, 125),
    ],
    'Dining': [
        ('EKEDALEN', 'Extendable table', 'Solid oak with extension leaves', 6990, 180, 75, 120, 52),
        ('MÖRBYLÅNGA', 'Table', 'Oak veneer with natural grain', 8990, 220, 75, 100, 65),
        ('LISABO', 'Table', 'Ash veneer rectangular table', 3999, 140, 74, 78, 32),
        ('NORDEN', 'Gateleg table', 'Table with drop-leaves', 3999, 152, 75, 80, 28),
        ('INGATORP', 'Extendable table', 'Traditional style drop-leaf', 4990, 155, 74, 87, 38),
        ('INGOLF', 'Chair', 'Solid wood construction', 999, 43, 91, 50, 6),
        ('HENRIKSDAL', 'Chair', 'Padded seat for comfort', 1799, 51, 97, 58, 8),
        ('TOBIAS', 'Chair', 'Transparent plastic', 699, 55, 80, 56, 5),
        ('STEFAN', 'Chair', 'Solid pine with traditional design', 599, 42, 90, 49, 4.5),
        ('EKEDALEN', 'Bar stool', 'Backrest for extra comfort', 1299, 40, 105, 45, 7),
    ],
    'Children\'s': [
        ('STUVA', 'Storage combination', 'Customizable children\'s storage', 3490, 150, 192, 50, 42),
        ('SMÅSTAD', 'Storage bench', 'Bench with toy storage', 1999, 90, 52, 60, 24),
        ('SMÅSTAD', 'Wardrobe', 'Children\'s wardrobe with rod', 2999, 60, 181, 50, 32),
        ('SUNDVIK', 'Children\'s bed', 'Extendable bed frame', 2299, 138, 68, 208, 22),
        ('BUSUNGE', 'Extendable bed', 'Grows with your child', 2499, 80, 53, 200, 28),
        ('MAMMUT', 'Children\'s table', 'Lightweight and durable', 599, 85, 48, 77, 5),
        ('MAMMUT', 'Children\'s chair', 'Indoor and outdoor use', 249, 39, 67, 36, 1.5),
        ('FLISAT', 'Children\'s desk', 'Adjustable to three heights', 999, 92, 67, 67, 12),
        ('FLISAT', 'Toy storage', 'With wheels and bins', 899, 44, 91, 39, 8),
        ('TROFAST', 'Storage combination', 'With boxes for toys', 1299, 94, 91, 44, 18),
    ],
    'Bathroom': [
        ('GODMORGON', 'Wash-stand with 2 drawers', 'Wall-mounted for easy cleaning', 3990, 100, 49, 58, 25),
        ('GODMORGON', 'Mirror cabinet', 'With 2 doors and integrated lighting', 2499, 100, 96, 14, 18),
        ('HEMNES', 'Sink cabinet', 'Traditional solid wood design', 4990, 120, 89, 47, 38),
        ('HEMNES', 'High cabinet', 'Traditional tall bathroom storage', 2999, 42, 172, 37, 28),
        ('VILTO', 'Shelf unit', 'Solid birch with moisture-resistant', 899, 46, 150, 37, 8),
        ('LILLÅNGEN', 'Mirror cabinet', 'Practical storage with mirror', 1499, 60, 78, 21, 12),
        ('ENHET', 'Wash-stand', 'Modern compact vanity', 2499, 64, 75, 42, 22),
        ('RÅGRUND', 'Chair with towel rack', 'Bamboo multi-function', 599, 38, 80, 40, 3.5),
    ],
}

MARKET_HALL_PRODUCTS = {
    'Textiles': [
        ('DVALA', 'Duvet cover and pillowcase', 'Soft cotton percale', 399, None, None, None, 0.8),
        ('ÄNGSLILJA', 'Duvet cover and pillowcase', 'White cotton with print', 599, None, None, None, 1.2),
        ('PUDERVIVA', 'Duvet cover and pillowcase', 'Light grey linen blend', 1299, None, None, None, 1.5),
        ('NATTJASMIN', 'Duvet cover and pillowcase', 'White with floral pattern', 499, None, None, None, 0.9),
        ('VINDUM', 'Rug, high pile', 'Dense thick pile', 1999, 170, None, 230, 4.5),
        ('STOENSE', 'Rug, low pile', 'Durable and easy to vacuum', 1499, 200, None, 200, 3.8),
        ('TOFTLUND', 'Rug', 'Microfiber soft texture', 799, 120, None, 180, 2.2),
        ('GURLI', 'Cushion cover', '100% cotton cover', 99, 50, 50, None, 0.15),
        ('SANELA', 'Cushion cover', 'Velvet with luxurious feel', 249, 50, 50, None, 0.2),
        ('VIGDIS', 'Cushion cover', 'Grey-turquoise cotton', 129, 50, 50, None, 0.15),
        ('MAJGULL', 'Blackout curtains', 'Block light effectively', 499, 145, None, 300, 1.8),
        ('HILJA', 'Curtains, 1 pair', 'Sheer white panels', 299, 145, None, 300, 1.2),
        ('TIBAST', 'Curtains, 1 pair', 'Cotton linen blend', 399, 145, None, 300, 1.4),
        ('VIGDIS', 'Throw', 'Soft and warm fleece', 299, 120, None, 170, 0.6),
        ('GURLI', 'Throw', 'Knitted cotton blanket', 349, 120, None, 170, 0.7),
        ('KRATTEN', 'Cushion', 'Filled cushion ready to use', 149, 40, 40, 15, 0.4),
        ('FJÄDRAR', 'Cushion', 'Inner cushion insert', 49, 50, 50, 9, 0.2),
        ('HIMMELSK', 'Bath towel', 'Soft terry cotton', 99, 70, None, 140, 0.4),
        ('VIKFJÄRD', 'Bath sheet', 'Extra large towel', 179, 100, None, 150, 0.8),
        ('TOFTBO', 'Bath mat', 'Microfiber soft and absorbent', 149, 60, None, 90, 0.5),
    ],
    'Cookshop': [
        ('IKEA 365+', 'Cookware set, 4 pieces', 'Stainless steel with thick base', 1999, None, None, None, 5.2),
        ('IKEA 365+', 'Pot with lid, 5L', 'Works on all cooktops', 599, 22, 15, 22, 1.8),
        ('IKEA 365+', 'Frying pan, 28cm', 'Stainless steel', 399, 28, 6, 49, 1.2),
        ('VARDAGEN', 'Frying pan', 'Cast iron for even heating', 599, 28, 5, 48, 2.1),
        ('VARDAGEN', 'Pot with lid, 3L', 'Stainless steel', 449, 18, 13, 18, 1.4),
        ('DRAGON', 'Cutlery, 24-piece', 'Stainless steel', 349, None, None, None, 1.5),
        ('SMAKFORSK', 'Cutlery, 24-piece', 'Modern matte finish', 599, None, None, None, 1.6),
        ('OFTAST', 'Plate', 'Simple white design', 39, 25, 2, 25, 0.3),
        ('OFTAST', 'Bowl', 'Stackable design', 29, 14, 5, 14, 0.2),
        ('FÄRGRIK', 'Plate', 'Colorful stoneware', 49, 27, 2, 27, 0.4),
        ('IKEA 365+', 'Food container with lid', 'Square glass container', 79, 15, 15, 15, 0.5),
        ('IKEA 365+', 'Water bottle', 'BPA-free plastic 0.5L', 39, 7, 21, 7, 0.15),
        ('KORKEN', 'Jar with lid', 'Clear glass storage', 49, 11, 13, 11, 0.35),
        ('STÄM', 'Chopping board', 'Natural bamboo', 149, 36, 2, 53, 1.2),
        ('PROPPMÄTT', 'Chopping board', 'Beech wood with handle', 199, 45, 2, 28, 0.8),
        ('MIXTUR', 'Mixing bowl set, 3 pieces', 'Stainless steel', 299, None, None, None, 1.8),
        ('FINMAT', 'Serving plate', 'Stoneware with reactive glaze', 199, 32, 3, 32, 0.8),
        ('TILLREDA', 'Kettle', 'Stainless steel 1.7L', 349, 21, 24, 22, 1.1),
        ('IDEALISK', 'Whisk', 'Stainless steel', 49, 6, 30, 6, 0.12),
        ('STÄM', 'Grater', '4-sided box grater', 99, 10, 23, 10, 0.3),
    ],
    'Home Organization': [
        ('SKUBB', 'Storage box', 'Fabric box with handles', 129, 44, 55, 19, 0.6),
        ('SKUBB', 'Box, set of 6', 'Compartments for drawers', 149, 31, 34, 11, 0.8),
        ('SKUBB', 'Shoe box', 'Holds 1 pair of shoes', 49, 22, 34, 16, 0.2),
        ('KUGGIS', 'Box with lid', 'Plastic storage box', 99, 26, 35, 18, 0.4),
        ('KUGGIS', 'Box with lid, set of 3', 'Stackable storage', 199, 18, 26, 15, 0.6),
        ('RISATORP', 'Basket', 'Wire basket with handles', 149, 25, 26, 37, 0.8),
        ('RISATORP', 'Basket, set of 2', 'Kitchen organizer baskets', 249, 25, 18, 37, 1.2),
        ('VARIERA', 'Pot lid organizer', 'Vertical storage for lids', 79, 13, 19, 50, 0.3),
        ('VARIERA', 'Box', 'Perfect for small items', 49, 24, 17, 10, 0.2),
        ('DRONA', 'Box', 'Foldable storage box', 49, 33, 38, 33, 0.4),
        ('DRONA', 'Box, set of 3', 'Fits KALLAX shelf', 199, 33, 38, 33, 1.2),
        ('BYGGLEK', 'LEGO box with lid', 'Storage meets creativity', 149, 26, 26, 18, 0.5),
        ('GLIS', 'Box with lid', 'Clear plastic storage', 39, 17, 10, 10, 0.15),
        ('GLIS', 'Box with lid, set of 3', 'Different sizes', 99, 17, 10, 10, 0.35),
        ('TJENA', 'Storage box with lid', 'Folds flat when not in use', 99, 35, 32, 50, 0.8),
        ('PALLRA', 'Box with lid', 'Mini storage container', 29, 10, 10, 10, 0.08),
    ],
    'Lighting': [
        ('RANARP', 'Work lamp', 'Adjustable arm and head', 599, 35, 42, 15, 1.8),
        ('RANARP', 'Floor/reading lamp', 'Flexible reading light', 899, 30, 155, 20, 3.2),
        ('TERTIAL', 'Work lamp', 'Classic design with clamp', 249, 17, 46, 12, 0.8),
        ('FORSÅ', 'Work lamp', 'Nickel-plated design', 349, 15, 35, 12, 0.9),
        ('LEDBERG', 'LED light strip', 'Flexible strip 5m', 499, None, None, None, 0.3),
        ('TRÅDFRI', 'LED bulb', 'Smart dimmable E27', 149, 6, 11, 6, 0.08),
        ('HEKTAR', 'Floor lamp', 'Industrial design with dimmer', 1299, 30, 176, 30, 4.5),
        ('HEKTAR', 'Pendant lamp', 'Industrial hanging light', 699, 38, 38, 38, 1.8),
        ('NOT', 'Floor lamp', 'With LED bulb', 399, 28, 175, 28, 1.8),
        ('NÄVLINGE', 'LED spotlight', 'Adjustable ceiling spotlight', 349, 11, 11, 11, 0.4),
        ('NYMÅNE', 'Ceiling spotlight', 'With 3 spotlights', 599, 74, 9, 7, 0.9),
        ('REGOLIT', 'Pendant lamp shade', 'Paper lamp shade', 79, 45, 45, 45, 0.15),
        ('MELODI', 'Pendant lamp', 'Ceiling lamp shade', 149, 38, 23, 38, 0.4),
        ('FADO', 'Table lamp', 'Glass sphere design', 249, 25, 25, 25, 0.8),
        ('TÄRNABY', 'Table lamp', 'Anthracite metal', 399, 25, 50, 25, 1.2),
        ('SKURUP', 'Floor lamp', 'Adjustable spotlight', 899, 23, 143, 23, 2.8),
    ],
    'Decoration': [
        ('FEJKA', 'Artificial plant', 'Realistic potted plant', 99, 12, 45, 12, 0.5),
        ('FEJKA', 'Artificial plant', 'Succulent assorted 6cm', 39, 6, 14, 6, 0.12),
        ('FEJKA', 'Artificial plant', 'Hanging eucalyptus', 149, 9, 80, 9, 0.3),
        ('SMYCKA', 'Artificial flower', 'Eucalyptus 65cm', 49, None, 65, None, 0.1),
        ('SMYCKA', 'Artificial flower', 'Peony light pink', 79, None, 30, None, 0.08),
        ('RIBBA', 'Frame', 'Picture frame 50x50cm', 149, 50, 50, 2, 0.8),
        ('RIBBA', 'Frame', 'Picture frame 21x30cm', 49, 21, 30, 2, 0.3),
        ('FISKBO', 'Frame', 'Simple black frame 13x18cm', 29, 13, 18, 2, 0.15),
        ('KNOPPÄNG', 'Frame', 'Set of 8 frames', 299, None, None, None, 1.5),
        ('GRADVIS', 'Plant pot', 'Terracotta indoor pot', 79, 19, 19, 19, 1.2),
        ('FÖRENLIG', 'Plant pot', 'Indoor/outdoor light grey', 69, 12, 14, 12, 0.4),
        ('SKURAR', 'Candle holder', 'Clear glass design', 49, 9, 9, 9, 0.3),
        ('GLIMMA', 'Unscented tealights', '100 pack', 59, None, None, None, 0.8),
        ('FULLTALIG', 'Scented candle', 'Apple & pear scent', 79, 8, 11, 8, 0.5),
        ('VINTERFINT', 'Decoration', 'Star with LED', 149, 30, 30, 6, 0.3),
        ('DOFTLJUS', 'Scented candle', 'Vanilla natural', 99, 8, 8, 8, 0.4),
    ],
}

WAREHOUSE_PRODUCTS = {
    'Flat-Pack Furniture': [
        ('KALLAX', 'Shelf unit', 'Versatile shelving unit 2x2', 599, 77, 77, 39, 14),
        ('KALLAX', 'Shelf unit', 'Versatile shelving unit 2x4', 899, 77, 147, 39, 26),
        ('KALLAX', 'Shelf unit', 'Versatile shelving unit 4x4', 1699, 147, 147, 39, 48),
        ('BILLY', 'Bookcase', 'Narrow bookcase', 599, 40, 202, 28, 18),
        ('BILLY', 'Bookcase', 'White bookcase 80cm', 699, 80, 202, 28, 30),
        ('BILLY', 'Bookcase', 'With glass doors', 1999, 80, 202, 30, 36),
        ('IVAR', 'Shelf unit', 'Untreated solid pine', 799, 89, 179, 50, 22),
        ('IVAR', 'Cabinet', 'Pine with door', 1499, 80, 179, 50, 28),
        ('BESTÅ', 'Shelf unit with doors', 'Customizable storage', 3490, 120, 64, 40, 32),
        ('BESTÅ', 'Frame', 'Base frame 60x20x64', 899, 60, 64, 20, 12),
        ('PAX', 'Wardrobe frame', 'Modular wardrobe 100cm', 4990, 100, 236, 58, 52),
        ('PAX', 'Wardrobe frame', 'Modular wardrobe 150cm', 6990, 150, 236, 58, 68),
        ('PAX', 'Wardrobe frame', 'Modular wardrobe 200cm', 8990, 200, 236, 58, 88),
        ('EKET', 'Cabinet', 'Asymmetric storage solution', 499, 35, 35, 35, 8),
        ('EKET', 'Cabinet with 4 compartments', 'White 70x35x70', 799, 70, 70, 35, 18),
        ('LACK', 'Side table', 'Easy to assemble table', 199, 55, 45, 55, 4),
        ('LACK', 'TV bench', 'Long and low media storage', 899, 149, 55, 35, 14),
        ('LACK', 'Wall shelf', 'Floating shelf white', 299, 110, 26, 26, 4),
        ('LISABO', 'Desk', 'Ash veneer desktop', 2499, 118, 74, 50, 24),
        ('MICKE', 'Desk', 'White compact desk', 999, 73, 75, 50, 16),
        ('MICKE', 'Add-on unit', 'High add-on unit', 399, 35, 65, 17, 5),
        ('ALEX', 'Desk', 'Desk with 9 drawers', 3999, 132, 76, 58, 42),
        ('ALEX', 'Drawer unit', '5 drawers on castors', 1299, 67, 66, 48, 24),
        ('NORDLI', 'Headboard', 'Storage headboard for bed', 1999, 160, 65, 38, 24),
        ('NORDLI', 'Chest of 4 drawers', 'Modular bedroom storage', 1999, 80, 99, 47, 28),
        ('TARVA', 'Chest of 5 drawers', 'Solid pine storage', 1499, 79, 92, 39, 22),
        ('TARVA', 'Nightstand', 'Solid pine 2 drawers', 599, 48, 62, 38, 12),
        ('HAVSTA', 'Cabinet with base', 'Traditional glass-door cabinet', 3990, 121, 134, 47, 45),
        ('HAVSTA', 'Storage combination', 'Glass doors white', 5990, 162, 134, 47, 62),
        ('STOCKHOLM', 'TV bench', 'Walnut veneer bench', 7490, 160, 50, 40, 38),
        ('STOCKHOLM', 'Cabinet', 'Walnut veneer with doors', 9990, 90, 187, 42, 58),
        ('BRIMNES', 'Wardrobe', '3-door wardrobe with mirror', 3999, 117, 190, 50, 58),
        ('BRIMNES', 'TV bench', 'With storage 180cm', 2499, 180, 53, 41, 32),
        ('BRIMNES', 'Chest of 4 drawers', 'White bedroom storage', 1999, 78, 124, 41, 38),
        ('KULLEN', 'Chest of 3 drawers', 'Affordable bedroom storage', 799, 70, 72, 40, 18),
        ('KULLEN', 'Chest of 5 drawers', 'White finish', 999, 70, 112, 40, 26),
        ('TRYSIL', 'Wardrobe', 'White sliding door wardrobe', 2999, 118, 195, 61, 52),
        ('TRYSIL', 'Chest of 4 drawers', 'White/light grey', 1499, 75, 99, 40, 28),
        ('PLATSA', 'Wardrobe frame', 'Flexible storage system', 2490, 120, 200, 55, 38),
        ('PLATSA', 'Bed frame with storage', 'With 4 drawers', 4990, 141, 43, 243, 68),
        ('RÅSKOG', 'Utility cart', 'Mobile storage on wheels', 599, 35, 78, 45, 8),
        ('HAUGA', 'Storage combination', 'Open and closed storage', 3990, 139, 116, 46, 48),
        ('LOMMARP', 'Cabinet', 'Dark blue-green metal', 2999, 102, 101, 49, 35),
    ],
    'Kitchen Systems': [
        ('METOD', 'Base cabinet', 'Frame 60x60x80', 999, 60, 80, 60, 16),
        ('METOD', 'Base cabinet', 'Frame 80x60x80', 1199, 80, 80, 60, 18),
        ('METOD', 'Wall cabinet', 'Frame 60x40x80', 699, 60, 80, 40, 10),
        ('METOD', 'Wall cabinet', 'Frame 80x40x80', 799, 80, 80, 40, 12),
        ('METOD', 'High cabinet frame', 'Tall cabinet 60x60x220', 2299, 60, 220, 60, 32),
        ('MAXIMERA', 'Drawer', 'High drawer 60cm', 449, 60, 20, 53, 5),
        ('MAXIMERA', 'Drawer', 'High drawer 80cm', 549, 80, 20, 53, 6),
        ('UTRUSTA', 'Hinge', 'Soft-closing hinge', 49, 5, 15, 5, 0.15),
        ('UTRUSTA', 'Shelf', 'Glass shelf 60cm', 199, 60, 1, 37, 2),
        ('TORNVIKEN', 'Island', 'Kitchen island off-white', 5990, 126, 90, 72, 58),
    ],
    'Bedroom Flat-Pack': [
        ('SLATTUM', 'Upholstered bed frame', 'Padded bed frame', 2999, 157, 104, 235, 42),
        ('SONGESAND', 'Bed frame', 'Traditional bed with storage', 4490, 150, 95, 207, 52),
        ('SONGESAND', 'Bed frame', 'White with 4 storage boxes', 5990, 164, 95, 207, 68),
        ('IDANÄS', 'Bed frame', 'Traditional design with headboard', 5990, 168, 132, 218, 58),
        ('IDANÄS', 'Bed frame with storage', 'With 4 drawers dark brown', 7990, 169, 132, 234, 78),
        ('HAUGA', 'Bed frame', 'Modern upholstered frame', 3490, 167, 95, 234, 48),
        ('HAUGA', 'Upholstered bed', 'With storage Vissle grey', 5490, 167, 120, 236, 68),
        ('NEIDEN', 'Bed frame', 'Simple pine bed', 1299, 97, 74, 207, 18),
        ('UTÅKER', 'Stackable bed', 'With 2 mattresses', 3999, 80, 46, 200, 42),
        ('MALM', 'Bed frame with storage', 'High with 4 storage boxes', 5999, 160, 107, 209, 88),
    ],
    'Seating Flat-Pack': [
        ('VEDBO', 'Armchair', 'High back with armrests', 2499, 70, 102, 72, 18),
        ('STRANDMON', 'Wing chair', 'Traditional wing chair', 3499, 82, 101, 96, 22),
        ('STRANDMON', 'Footstool', 'Matching wing chair footstool', 1499, 60, 44, 54, 8),
        ('KOARP', 'Armchair', 'Modern design with birch legs', 1999, 76, 80, 72, 14),
        ('EKOLSUND', 'Recliner', 'Recliner with footstool', 4990, 82, 104, 88, 32),
        ('GRÖNLID', 'Armchair', 'Sporda natural cover', 3999, 98, 104, 98, 28),
        ('GRÖNLID', 'Footstool', 'With storage', 1999, 89, 45, 89, 18),
        ('JÄPPLING', 'Armchair', 'Anthracite with recliner', 2999, 74, 102, 82, 24),
        ('MUREN', 'Recliner', 'Rådesten light brown', 3999, 79, 105, 85, 28),
        ('KLINSTA', 'Armchair', 'Black leather look', 1999, 72, 83, 78, 16),
        ('HAVBERG', 'Armchair', 'High back in beige', 2499, 80, 110, 85, 22),
        ('FÄRLÖV', 'Armchair', 'Flodafors white', 4999, 96, 95, 87, 26),
    ],
}


def generate_article_number() -> str:
    """Generate realistic IKEA article number (format: XXX.XXX.XX)"""
    return f"{random.randint(100, 999)}.{random.randint(100, 999)}.{random.randint(10, 99)}"


def create_product(
    product_id: int,
    zone: str,
    category: str,
    subcategory: str,
    name: str,
    product_type: str,
    description: str,
    price: float,
    width: Optional[float],
    height: Optional[float],
    depth: Optional[float],
    weight: float,
) -> Dict:
    """Create a product dictionary with all required fields"""

    # Generate location based on zone
    if zone == 'warehouse':
        aisle = random.randint(1, 30)
        bay = random.randint(1, 10)
        section = random.choice(['A', 'B', 'C', 'D'])
    elif zone == 'market_hall':
        aisle = random.randint(31, 45)
        bay = random.randint(1, 8)
        section = 'MH'  # Market Hall
    else:  # showroom
        aisle = random.randint(46, 60)
        bay = random.randint(1, 5)
        section = 'SR'  # Showroom

    # Generate realistic stock quantities
    if zone == 'warehouse':
        stock = random.randint(10, 100)
    elif zone == 'market_hall':
        stock = random.randint(50, 200)
    else:  # showroom
        stock = random.randint(1, 10)  # Display items have low stock

    # Color options based on product type
    colors = []
    if 'Sofa' in product_type or 'Chair' in product_type or 'Armchair' in product_type:
        colors = random.sample(['Grey', 'Beige', 'Blue', 'Brown', 'Green'], k=random.randint(2, 3))
    elif 'white' in description.lower() or 'White' in product_type:
        colors = ['White']
    elif 'Table' in product_type or 'Desk' in product_type:
        colors = random.sample(['White', 'Black-brown', 'Oak', 'Walnut'], k=random.randint(1, 2))
    else:
        colors = random.sample(['White', 'Black', 'Natural', 'Grey', 'Brown'], k=random.randint(1, 2))

    # Tags for searchability
    tags = [zone, category.lower().replace(' ', '_'), product_type.lower().replace(' ', '_')]
    if colors:
        tags.extend([c.lower() for c in colors[:2]])

    # Assembly required (most IKEA furniture requires assembly)
    assembly = zone == 'warehouse' or random.random() > 0.3

    return {
        'id': f'prod_{product_id:04d}',
        'article_number': generate_article_number(),
        'name': name,
        'description': description,
        'category': category,
        'subcategory': subcategory,
        'product_type': product_type,
        'price': float(price),
        'currency': 'SEK',
        'width_cm': width,
        'height_cm': height,
        'depth_cm': depth,
        'weight_kg': weight,
        'zone': zone,
        'aisle': aisle,
        'bay': bay,
        'section': section,
        'stock_quantity': stock,
        'in_stock': stock > 0,
        'image_url': f'https://www.ikea.com/se/sv/images/products/{name.lower().split()[0]}-{product_type.lower().replace(" ", "-")}.jpg',
        'tags': tags,
        'colors_available': colors,
        'assembly_required': assembly,
    }


def generate_all_products() -> List[Dict]:
    """Generate 200 realistic IKEA products"""
    products = []
    product_id = 1

    print("\n🏗️  Generating products...")

    # Generate Showroom Products (~60 products)
    print("  📺 Generating showroom products...")
    for category, items in SHOWROOM_PRODUCTS.items():
        for item in items:
            name, product_type, description, price, width, height, depth, weight = item
            product = create_product(
                product_id, 'showroom', category, None, name, product_type,
                description, price, width, height, depth, weight
            )
            products.append(product)
            product_id += 1

    # Generate Market Hall Products (~80 products)
    print("  🛍️  Generating market hall products...")
    for category, items in MARKET_HALL_PRODUCTS.items():
        for item in items:
            name, product_type, description, price, width, height, depth, weight = item
            product = create_product(
                product_id, 'market_hall', 'Market Hall', category, name, product_type,
                description, price, width, height, depth, weight
            )
            products.append(product)
            product_id += 1

    # Generate Warehouse Products (~60 products)
    print("  📦 Generating warehouse products...")
    for category, items in WAREHOUSE_PRODUCTS.items():
        for item in items:
            name, product_type, description, price, width, height, depth, weight = item
            product = create_product(
                product_id, 'warehouse', 'Warehouse', category, name, product_type,
                description, price, width, height, depth, weight
            )
            products.append(product)
            product_id += 1

    print(f"  ✅ Generated {len(products)} products total")
    return products


def seed_database(database_url: str):
    """Seed PostgreSQL database with products"""

    print(f"\n🔗 Connecting to PostgreSQL...")
    print(f"   {database_url.split('@')[1] if '@' in database_url else database_url}")

    try:
        # Create engine
        engine = create_engine(database_url, echo=False)

        # Create tables
        print("📋 Creating tables...")
        Base.metadata.drop_all(engine)  # Drop existing tables
        Base.metadata.create_all(engine)
        print("   ✅ Tables created")

        # Generate products
        products = generate_all_products()

        # Create session
        SessionLocal = sessionmaker(bind=engine)
        session: Session = SessionLocal()

        try:
            # Insert products
            print(f"\n💾 Inserting {len(products)} products...")

            for i, product_data in enumerate(products, 1):
                product = Product(**product_data)
                session.add(product)

                if i % 50 == 0:
                    print(f"   ... {i}/{len(products)} products inserted")

            session.commit()
            print(f"   ✅ All {len(products)} products committed to database")

            # Print statistics
            print("\n📊 Product Statistics:")

            # Count by zone
            for zone in ['warehouse', 'market_hall', 'showroom']:
                count = session.query(Product).filter(Product.zone == zone).count()
                print(f"   {zone.replace('_', ' ').title()}: {count} products")

            # Count by category
            print("\n📁 Products by Category:")
            categories = session.query(Product.category).distinct().all()
            for (category,) in sorted(categories):
                count = session.query(Product).filter(Product.category == category).count()
                print(f"   {category}: {count}")

            # Total value
            total_value = session.query(Product.price).all()
            total = sum(p[0] for p in total_value)
            print(f"\n💰 Total inventory value: {total:,.0f} SEK")

            # Stock statistics
            in_stock = session.query(Product).filter(Product.in_stock == True).count()
            total_stock = sum(p[0] for p in session.query(Product.stock_quantity).all())
            print(f"📦 Products in stock: {in_stock}/{len(products)}")
            print(f"📊 Total stock units: {total_stock:,}")

        except Exception as e:
            session.rollback()
            print(f"❌ Error inserting products: {e}")
            raise
        finally:
            session.close()

    except Exception as e:
        print(f"❌ Database error: {e}")
        sys.exit(1)


def main():
    """Main entry point"""
    print("=" * 60)
    print("🏪 IKEA Product Database Seeder - PostgreSQL Edition")
    print("=" * 60)

    # Get database URL from environment or use default
    database_url = os.getenv(
        'DATABASE_URL',
        'postgresql://postgres:postgres@localhost:5432/ikea_products'
    )

    seed_database(database_url)

    print("\n✅ Database seeding complete!")
    print("=" * 60)


if __name__ == '__main__':
    main()

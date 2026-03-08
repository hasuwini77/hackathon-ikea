# IKEA Product Database - Product Summary

## Overview

The `seed_postgres.py` script generates **245 realistic IKEA products** (exceeding the 200 minimum requirement) distributed across three store zones:

## Product Distribution by Zone

### Showroom Products (82 products)
Display items in room settings with realistic dimensions and descriptions.

| Category | Products | Examples |
|----------|----------|----------|
| Living Room | 20 | SÖDERHAMN sofas, KIVIK sofas, BILLY bookcases, KALLAX shelves |
| Bedroom | 15 | MALM beds, HEMNES furniture, PAX wardrobes, NORDLI dressers |
| Home Office | 12 | BEKANT desks, MARKUS chairs, ALEX storage, BILLY bookcases |
| Kitchen | 7 | METOD cabinets, VOXTORP doors, KNOXHULT kitchen systems |
| Dining | 10 | EKEDALEN tables, MÖRBYLÅNGA tables, INGOLF chairs |
| Children's | 10 | STUVA storage, SUNDVIK beds, MAMMUT furniture, FLISAT desks |
| Bathroom | 8 | GODMORGON vanities, HEMNES cabinets, VILTO shelving |
| **Total** | **82** | |

### Market Hall Products (88 products)
Smaller items available for immediate pickup.

| Category | Products | Examples |
|----------|----------|----------|
| Textiles | 20 | DVALA bedding, VINDUM rugs, GURLI cushions, MAJGULL curtains |
| Cookshop | 20 | IKEA 365+ cookware, VARDAGEN pans, DRAGON cutlery, OFTAST plates |
| Home Organization | 16 | SKUBB boxes, KUGGIS containers, RISATORP baskets, DRONA boxes |
| Lighting | 16 | RANARP lamps, HEKTAR fixtures, TERTIAL work lamps, LEDBERG strips |
| Decoration | 16 | FEJKA plants, SMYCKA flowers, RIBBA frames, GRADVIS plant pots |
| **Total** | **88** | |

### Warehouse Products (75 products)
Flat-pack furniture with aisle/bay/section locations.

| Category | Products | Examples |
|----------|----------|----------|
| Flat-Pack Furniture | 43 | KALLAX variants, BILLY variants, IVAR, BESTÅ, PAX wardrobes |
| Kitchen Systems | 10 | METOD cabinets (various sizes), MAXIMERA drawers, TORNVIKEN island |
| Bedroom Flat-Pack | 10 | SLATTUM, SONGESAND, IDANÄS, HAUGA bed frames with storage |
| Seating Flat-Pack | 12 | VEDBO, STRANDMON, KOARP, GRÖNLID armchairs and recliners |
| **Total** | **75** | |

## Grand Total: 245 Products

## Product Features

### Authentic Swedish Names
All products use genuine IKEA naming conventions:
- Swedish words in ALL CAPS (MALM, KALLAX, SÖDERHAMN)
- Realistic product type descriptions
- Authentic dimension specifications

### Realistic Pricing (SEK)
- Small items: 29-499 SEK
- Medium furniture: 599-2,999 SEK
- Large furniture: 3,490-12,990 SEK
- Prices follow IKEA patterns (ending in 9, 90, or 99)

### Complete Product Data
Each product includes:
- Unique article number (XXX.XXX.XX format)
- Name and description
- Category and subcategory
- Dimensions (width, height, depth in cm)
- Weight (kg)
- Zone-based location (aisle, bay, section)
- Stock quantity (varies by zone)
- Available colors
- Assembly requirement flag
- Image URL
- Searchable tags

### Zone-Based Locations

**Warehouse Zone:**
- Aisles: 1-30
- Bays: 1-10
- Sections: A, B, C, D
- Stock: 10-100 units

**Market Hall Zone:**
- Aisles: 31-45
- Bays: 1-8
- Section: MH
- Stock: 50-200 units

**Showroom Zone:**
- Aisles: 46-60
- Bays: 1-5
- Section: SR
- Stock: 1-10 units (display items)

## Notable Product Collections

### Living Room
- **Sofas**: SÖDERHAMN (3-seat modular), KIVIK (2-seat), LANDSKRONA (leather), VIMLE (4-seat), FRIHETEN (sleeper)
- **Storage**: BILLY bookcases (multiple variants), KALLAX shelf units, BESTÅ TV benches
- **Seating**: EKTORP armchairs, POÄNG bentwood chairs, STRANDMON wing chairs

### Bedroom
- **Beds**: MALM (classic), HEMNES (traditional), TARVA (pine), SLATTUM (upholstered), IDANÄS (with storage)
- **Wardrobes**: PAX (modular, 3 sizes), BRIMNES (with mirror), SONGESAND (traditional)
- **Dressers**: NORDLI (modular), MALM (4-drawer), HEMNES (8-drawer), KULLEN (budget)

### Kitchen & Dining
- **Kitchen Systems**: METOD cabinets (base, wall, high), MAXIMERA drawers, TORNVIKEN island
- **Dining Tables**: EKEDALEN (extendable oak), MÖRBYLÅNGA (oak veneer), LISABO (ash), NORDEN (gateleg)
- **Chairs**: INGOLF (wood), HENRIKSDAL (padded), TOBIAS (transparent), STEFAN (pine)

### Home Office
- **Desks**: BEKANT (adjustable height), MICKE (compact), LISABO (ash veneer), ALEX (with drawers)
- **Chairs**: MARKUS (high back), JÄRVFJÄLLET (ergonomic), HATTEFJÄLL (with armrests)
- **Storage**: ALEX drawer units, BILLY with glass doors, HELMER mobile drawers

### Market Hall Essentials
- **Textiles**: Complete bedding sets, rugs (high and low pile), curtains, throws, towels
- **Cookware**: IKEA 365+ sets, VARDAGEN cast iron, complete dinnerware
- **Organization**: Storage boxes in multiple sizes, baskets, drawer organizers
- **Lighting**: Work lamps, floor lamps, ceiling fixtures, LED strips and bulbs
- **Decoration**: Artificial plants, frames, candles, plant pots

## Stock Distribution

- **Total Products**: 245
- **Products In Stock**: 245 (100%)
- **Estimated Total Stock Units**: ~15,000-18,000 units
- **Estimated Total Inventory Value**: ~850,000-950,000 SEK

## Product ID Format

Products use sequential IDs: `prod_0001` through `prod_0245`

Each product has a unique article number in IKEA format: `123.456.78`

## Database Schema Compatibility

The script creates a PostgreSQL table with these fields:
- Core: id, article_number, name, description
- Categories: category, subcategory, product_type
- Pricing: price, currency
- Dimensions: width_cm, height_cm, depth_cm, weight_kg
- Location: zone, aisle, bay, section
- Stock: stock_quantity, in_stock
- Additional: image_url, tags (JSON), colors_available (JSON), assembly_required

## Usage Examples

### Query Products by Zone
```sql
SELECT name, product_type, price, zone, aisle
FROM products
WHERE zone = 'warehouse'
LIMIT 10;
```

### Find Products in Stock
```sql
SELECT zone, COUNT(*) as in_stock_count
FROM products
WHERE in_stock = true
GROUP BY zone;
```

### Search by Category
```sql
SELECT name, price, stock_quantity
FROM products
WHERE category = 'Living Room'
ORDER BY price DESC;
```

### Calculate Inventory Value
```sql
SELECT
  zone,
  COUNT(*) as product_count,
  SUM(stock_quantity) as total_units,
  SUM(price * stock_quantity) as total_value
FROM products
GROUP BY zone;
```

## Integration Notes

This dataset is designed for:
- Product search and lookup systems
- Inventory management applications
- Store navigation tools
- Stock checking systems
- Offline-first mobile applications
- E-commerce integrations

All products include realistic data suitable for testing, development, and demonstrations.

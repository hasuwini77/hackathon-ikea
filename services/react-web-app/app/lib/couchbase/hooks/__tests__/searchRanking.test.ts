import { describe, expect, it } from 'vitest';
import { dedupeProductDocuments, rankProductsBySearch } from '../../client';
import type { ProductDocument } from '../../types';

function makeProduct(overrides: Partial<ProductDocument>): ProductDocument {
  return {
    _id: overrides._id ?? `product:${overrides.articleNumber ?? 'x'}`,
    type: 'product',
    articleNumber: overrides.articleNumber ?? '000000',
    name: overrides.name ?? 'Unknown Product',
    description: overrides.description ?? 'No description',
    category: overrides.category ?? 'general',
    productType: overrides.productType ?? 'item',
    price: overrides.price ?? 10,
    currency: overrides.currency ?? 'SEK',
    stock: overrides.stock ?? { quantity: 5, location: 'A1' },
    dimensions: overrides.dimensions ?? { depth: 10, width: 10, height: 10, unit: 'cm' },
    weight: overrides.weight ?? { value: 1, unit: 'kg' },
    tags: overrides.tags ?? [],
    inStock: overrides.inStock ?? true,
    lastUpdated: overrides.lastUpdated ?? '2026-03-10T00:00:00Z',
    ...overrides,
  };
}

describe('rankProductsBySearch', () => {
  it('ranks exact matches before fuzzy matches in smart mode', () => {
    const products = [
      makeProduct({
        _id: 'product:exact',
        articleNumber: '10020030',
        name: 'BILLY',
        description: 'Bookcase',
      }),
      makeProduct({
        _id: 'product:fuzzy',
        articleNumber: '10020031',
        name: 'BILLEY',
        description: 'Tall shelf',
      }),
    ];

    const ranked = rankProductsBySearch(products, 'billy', 'smart');

    expect(ranked).toHaveLength(2);
    expect(ranked[0]._id).toBe('product:exact');
    expect(ranked[0]._searchMatchKind).toBe('exact');
    expect(ranked[1]._searchMatchKind).toBe('fuzzy');
  });

  it('sorts fuzzy matches by estimated confidence descending', () => {
    const products = [
      makeProduct({
        _id: 'product:a',
        articleNumber: '20030040',
        name: 'Stockholm Sofa',
        description: '3-seat fabric sofa',
      }),
      makeProduct({
        _id: 'product:b',
        articleNumber: '20030041',
        name: 'Stokhlam Side Table',
        description: 'Oak side table',
      }),
      makeProduct({
        _id: 'product:c',
        articleNumber: '20030042',
        name: 'Stchlome Floor Lamp',
        description: 'Metal floor lamp',
      }),
    ];

    const ranked = rankProductsBySearch(products, 'stockhlm', 'smart').filter(
      (product) => product._searchMatchKind === 'fuzzy'
    );

    expect(ranked.length).toBeGreaterThan(1);
    for (let i = 0; i < ranked.length - 1; i++) {
      expect((ranked[i]._searchScore ?? 0)).toBeGreaterThanOrEqual(ranked[i + 1]._searchScore ?? 0);
    }
  });

  it('dedupes products by article number and keeps newest record', () => {
    const products = [
      makeProduct({
        _id: 'product:old',
        _rev: '1-abc',
        articleNumber: '300.400.50',
        name: 'HEMNES Shelf (old)',
        lastUpdated: '2026-03-01T00:00:00Z',
      }),
      makeProduct({
        _id: 'product:new',
        _rev: '3-def',
        articleNumber: '300.400.50',
        name: 'HEMNES Shelf',
        lastUpdated: '2026-03-10T00:00:00Z',
      }),
      makeProduct({
        _id: 'product:other',
        articleNumber: '700.800.90',
        name: 'KALLAX Unit',
      }),
    ];

    const deduped = dedupeProductDocuments(products);
    expect(deduped).toHaveLength(2);
    expect(deduped.find((p) => p.articleNumber === '300.400.50')?._id).toBe('product:new');
    expect(deduped.find((p) => p.articleNumber === '700.800.90')?._id).toBe('product:other');
  });
});

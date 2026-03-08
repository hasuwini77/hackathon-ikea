/**
 * Realistic IKEA Store Map SVG Component
 *
 * A realistic SVG-based IKEA store visualization with:
 * - Showroom section: Curved maze-like path through themed rooms
 * - Market Hall: Open area with distinct sections
 * - Warehouse: Grid of numbered aisles
 * - Service areas: Checkout, Restaurant/Bistro, Entry/Exit
 *
 * Features:
 * - Interactive zone/aisle highlighting
 * - Zoom and pan controls
 * - Product location markers
 * - Hover tooltips
 * - IKEA-branded colors and styling
 */

import { useState, useRef, useEffect } from 'react';
import { useNavigation, useStartLocations } from '../../lib/pathfinding/useNavigation';
import type { Location } from '../../lib/pathfinding';

// IKEA Brand Colors
const IKEA_BLUE = '#0058A3';
const IKEA_YELLOW = '#FFDB00';
const LIGHT_GRAY = '#F5F5F5';
const PATH_GRAY = '#E0E0E0';
const WAREHOUSE_GRAY = '#BDBDBD';
const ROOM_WHITE = '#FAFAFA';

export interface RealisticStoreMapProps {
  highlightedLocation?: {
    zone: string;
    aisle?: number;
    bay?: number;
  };
  products?: Array<{
    id: string;
    name?: string;
    zone: string;
    aisle?: number;
    bay?: number;
    sourceAisle?: number;
    sourceBay?: number;
    section?: string;
    stockLevel?: number;
  }>;
  onLocationClick?: (location: { zone: string; aisle?: number; bay?: number }) => void;
  className?: string;
  showProductDirectory?: boolean;
}

interface TooltipState {
  visible: boolean;
  content: string;
  x: number;
  y: number;
}

export function RealisticStoreMap({
  highlightedLocation,
  products = [],
  onLocationClick,
  className = '',
  showProductDirectory = false,
}: RealisticStoreMapProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    content: '',
    x: 0,
    y: 0,
  });
  const [selectedProduct, setSelectedProduct] = useState<typeof products[0] | null>(null);
  const [showStartLocationPicker, setShowStartLocationPicker] = useState(false);
  const [stockFilter, setStockFilter] = useState<'all' | 'out' | 'low' | 'good'>('all');
  const svgRef = useRef<SVGSVGElement>(null);

  // Navigation hook
  const navigation = useNavigation();
  const startLocations = useStartLocations();

  // Zoom handlers
  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.2, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.2, 0.5));
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Pan/drag handlers
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
  };

  const handleTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setPan({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => setIsDragging(false);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  // Location click handler
  const handleZoneClick = (zone: string, aisle?: number, bay?: number) => {
    onLocationClick?.({ zone, aisle, bay });
  };

  // Tooltip handlers
  const showTooltip = (content: string, x: number, y: number) => {
    setTooltip({ visible: true, content, x, y });
  };

  const hideTooltip = () => {
    setTooltip({ visible: false, content: '', x: 0, y: 0 });
  };

  // Check if location is highlighted
  const isHighlighted = (zone: string, aisle?: number) => {
    if (!highlightedLocation) return false;
    if (highlightedLocation.zone !== zone) return false;
    if (aisle !== undefined && highlightedLocation.aisle !== undefined) {
      return highlightedLocation.aisle === aisle;
    }
    return true;
  };

  // Get products for a specific location
  const getProductsAtLocation = (zone: string, aisle?: number) => {
    return products.filter((p) => {
      if (p.zone !== zone) return false;
      if (aisle !== undefined && p.aisle !== undefined) {
        if (p.aisle !== aisle) return false;
      }

      // Apply stock filter
      if (stockFilter === 'all') return true;
      const stock = p.stockLevel || 0;
      if (stockFilter === 'out') return stock === 0;
      if (stockFilter === 'low') return stock > 0 && stock <= 10;
      if (stockFilter === 'good') return stock > 10;
      return true;
    });
  };

  const formatProductTooltip = (product: (typeof products)[number]): string => {
    const label = product.name || product.id;
    const aisle = product.sourceAisle ?? product.aisle;
    const bay = product.sourceBay ?? product.bay;
    const locationText =
      aisle !== undefined && bay !== undefined ? `\\nAisle ${aisle}, Bay ${bay}` : "";
    return `${label}${locationText}\\nStock: ${product.stockLevel || 0}`;
  };

  // Get product dot color based on stock level
  const getStockColor = (stockLevel: number = 0): string => {
    if (stockLevel === 0) return '#ef4444'; // red-500 - out of stock
    if (stockLevel <= 10) return '#f59e0b'; // amber-500 - low stock
    return '#22c55e'; // green-500 - good stock
  };

  // Get product dot radius based on stock level
  const getStockRadius = (stockLevel: number = 0): number => {
    if (stockLevel === 0) return 5;
    if (stockLevel <= 10) return 5.5;
    return 6;
  };

  // Check if product is out of stock for pulse animation
  const isOutOfStock = (stockLevel: number = 0): boolean => {
    return stockLevel === 0;
  };

  // Navigation handlers
  const handleNavigateToProduct = (product: typeof products[0]) => {
    setSelectedProduct(product);
    setShowStartLocationPicker(true);
  };

  const handleStartNavigation = (startLocationId: string) => {
    if (!selectedProduct) return;

    const startLoc = startLocations.find((loc) => loc.id === startLocationId);
    if (!startLoc) return;

    const endLoc: Location = {
      zone: selectedProduct.zone,
      aisle: selectedProduct.aisle,
      bay: selectedProduct.bay,
      section: selectedProduct.section,
    };

    navigation.startNavigation(startLoc.location, endLoc);
    setShowStartLocationPicker(false);
  };

  const handleClearNavigation = () => {
    navigation.clearNavigation();
    setSelectedProduct(null);
  };

  return (
    <div className={`relative w-full h-full bg-gray-50 overflow-hidden ${className}`}>
      {/* Stock Filter Controls */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 bg-white rounded-lg shadow-md p-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-700">Filter:</span>
          <button
            onClick={() => setStockFilter('all')}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              stockFilter === 'all'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setStockFilter('out')}
            className={`px-3 py-1 text-xs rounded transition-colors flex items-center gap-1 ${
              stockFilter === 'out'
                ? 'bg-red-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            Out of Stock
          </button>
          <button
            onClick={() => setStockFilter('low')}
            className={`px-3 py-1 text-xs rounded transition-colors flex items-center gap-1 ${
              stockFilter === 'low'
                ? 'bg-amber-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <div className="w-2 h-2 rounded-full bg-amber-500"></div>
            Low Stock
          </button>
          <button
            onClick={() => setStockFilter('good')}
            className={`px-3 py-1 text-xs rounded transition-colors flex items-center gap-1 ${
              stockFilter === 'good'
                ? 'bg-green-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            In Stock
          </button>
        </div>
      </div>

      {/* Zoom Controls */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 bg-white rounded-lg shadow-md p-2">
        <button
          onClick={handleZoomIn}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
          aria-label="Zoom in"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
          aria-label="Zoom out"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>
        <button
          onClick={handleResetZoom}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
          aria-label="Reset zoom"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>

      {/* Tooltip */}
      {tooltip.visible && (
        <div
          className="absolute z-30 bg-gray-900 text-white px-3 py-2 rounded-lg text-sm shadow-lg pointer-events-none whitespace-pre-line"
          style={{
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
            transform: 'translate(-50%, -120%)',
          }}
        >
          {tooltip.content}
        </div>
      )}

      {/* SVG Map */}
      <svg
        ref={svgRef}
        viewBox="0 0 1200 800"
        className="w-full h-full cursor-move"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
          transition: isDragging ? 'none' : 'transform 0.2s ease-out',
          touchAction: 'none',
        }}
      >
        {/* Background */}
        <rect width="1200" height="800" fill={LIGHT_GRAY} />

        {/* ENTRANCE (Bottom Center) */}
        <g aria-label="Entrance">
          <rect x="450" y="750" width="300" height="50" fill={IKEA_BLUE} />
          <text x="600" y="780" textAnchor="middle" fill="white" fontSize="20" fontWeight="bold">
            ENTRANCE
          </text>
          <path d="M 500 750 L 520 730 M 550 750 L 570 730 M 600 750 L 620 730 M 650 750 L 670 730 M 700 750 L 720 730" stroke="white" strokeWidth="2" />
        </g>

        {/* SHOWROOM SECTION (Top Left - Curved Maze) */}
        <g aria-label="Showroom">
          {/* Showroom Background */}
          <rect x="50" y="50" width="500" height="350" fill={ROOM_WHITE} stroke={IKEA_BLUE} strokeWidth="3" />
          <text x="300" y="30" textAnchor="middle" fill={IKEA_BLUE} fontSize="24" fontWeight="bold">
            SHOWROOM
          </text>

          {/* Living Room */}
          <g
            onClick={() => handleZoneClick('showroom', 1)}
            onMouseEnter={(e) => showTooltip('Living Room (Aisles 1-3)', e.clientX, e.clientY)}
            onMouseLeave={hideTooltip}
            className="cursor-pointer"
          >
            <path
              d="M 70 70 Q 150 70 180 100 L 180 180 Q 180 200 200 200 L 250 200"
              fill="none"
              stroke={isHighlighted('showroom', 1) ? IKEA_YELLOW : PATH_GRAY}
              strokeWidth={isHighlighted('showroom', 1) ? '8' : '4'}
            />
            <rect
              x="80"
              y="80"
              width="140"
              height="100"
              fill={isHighlighted('showroom', 1) ? IKEA_YELLOW : '#E3F2FD'}
              fillOpacity="0.5"
              stroke={IKEA_BLUE}
              strokeWidth="2"
            />
            <text x="150" y="135" textAnchor="middle" fontSize="14" fontWeight="bold">
              Living Room
            </text>
            {getProductsAtLocation('showroom', 1).map((p, i) => (
              <g
                key={p.id || `showroom-1-product-${i}`}
                onMouseEnter={(e) => showTooltip(formatProductTooltip(p), e.clientX, e.clientY)}
                onMouseLeave={hideTooltip}
                className="cursor-pointer"
              >
                {isOutOfStock(p.stockLevel) && (
                  <circle
                    cx={100 + i * 20}
                    cy={160}
                    r={getStockRadius(p.stockLevel) + 3}
                    fill={getStockColor(p.stockLevel)}
                    opacity="0.5"
                  >
                    <animate
                      attributeName="r"
                      from={getStockRadius(p.stockLevel) + 3}
                      to={getStockRadius(p.stockLevel) + 8}
                      dur="1.5s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      from="0.5"
                      to="0"
                      dur="1.5s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}
                <circle
                  cx={100 + i * 20}
                  cy={160}
                  r={getStockRadius(p.stockLevel)}
                  fill={getStockColor(p.stockLevel)}
                  stroke="white"
                  strokeWidth="2"
                />
              </g>
            ))}
          </g>

          {/* Bedroom */}
          <g
            onClick={() => handleZoneClick('showroom', 4)}
            onMouseEnter={(e) => showTooltip('Bedroom (Aisles 4-6)', e.clientX, e.clientY)}
            onMouseLeave={hideTooltip}
            className="cursor-pointer"
          >
            <path
              d="M 250 200 L 300 200 Q 320 200 320 220 L 320 280 Q 320 300 300 300 L 250 300"
              fill="none"
              stroke={isHighlighted('showroom', 4) ? IKEA_YELLOW : PATH_GRAY}
              strokeWidth={isHighlighted('showroom', 4) ? '8' : '4'}
            />
            <rect
              x="260"
              y="210"
              width="140"
              height="100"
              fill={isHighlighted('showroom', 4) ? IKEA_YELLOW : '#E3F2FD'}
              fillOpacity="0.5"
              stroke={IKEA_BLUE}
              strokeWidth="2"
            />
            <text x="330" y="265" textAnchor="middle" fontSize="14" fontWeight="bold">
              Bedroom
            </text>
            {getProductsAtLocation('showroom', 4).map((p, i) => (
              <g
                key={p.id || `showroom-4-product-${i}`}
                onMouseEnter={(e) => showTooltip(formatProductTooltip(p), e.clientX, e.clientY)}
                onMouseLeave={hideTooltip}
                className="cursor-pointer"
              >
                {isOutOfStock(p.stockLevel) && (
                  <circle
                    cx={280 + i * 20}
                    cy={290}
                    r={getStockRadius(p.stockLevel) + 3}
                    fill={getStockColor(p.stockLevel)}
                    opacity="0.5"
                  >
                    <animate
                      attributeName="r"
                      from={getStockRadius(p.stockLevel) + 3}
                      to={getStockRadius(p.stockLevel) + 8}
                      dur="1.5s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      from="0.5"
                      to="0"
                      dur="1.5s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}
                <circle
                  cx={280 + i * 20}
                  cy={290}
                  r={getStockRadius(p.stockLevel)}
                  fill={getStockColor(p.stockLevel)}
                  stroke="white"
                  strokeWidth="2"
                />
              </g>
            ))}
          </g>

          {/* Kitchen */}
          <g
            onClick={() => handleZoneClick('showroom', 7)}
            onMouseEnter={(e) => showTooltip('Kitchen (Aisles 7-8)', e.clientX, e.clientY)}
            onMouseLeave={hideTooltip}
            className="cursor-pointer"
          >
            <path
              d="M 250 300 L 200 300 Q 180 300 180 320 L 180 360 L 130 360"
              fill="none"
              stroke={isHighlighted('showroom', 7) ? IKEA_YELLOW : PATH_GRAY}
              strokeWidth={isHighlighted('showroom', 7) ? '8' : '4'}
            />
            <rect
              x="80"
              y="310"
              width="140"
              height="70"
              fill={isHighlighted('showroom', 7) ? IKEA_YELLOW : '#E3F2FD'}
              fillOpacity="0.5"
              stroke={IKEA_BLUE}
              strokeWidth="2"
            />
            <text x="150" y="350" textAnchor="middle" fontSize="14" fontWeight="bold">
              Kitchen
            </text>
            {getProductsAtLocation('showroom', 7).map((p, i) => (
              <g
                key={p.id || `showroom-7-product-${i}`}
                onMouseEnter={(e) => showTooltip(formatProductTooltip(p), e.clientX, e.clientY)}
                onMouseLeave={hideTooltip}
                className="cursor-pointer"
              >
                {isOutOfStock(p.stockLevel) && (
                  <circle
                    cx={100 + i * 20}
                    cy={365}
                    r={getStockRadius(p.stockLevel) + 3}
                    fill={getStockColor(p.stockLevel)}
                    opacity="0.5"
                  >
                    <animate
                      attributeName="r"
                      from={getStockRadius(p.stockLevel) + 3}
                      to={getStockRadius(p.stockLevel) + 8}
                      dur="1.5s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      from="0.5"
                      to="0"
                      dur="1.5s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}
                <circle
                  cx={100 + i * 20}
                  cy={365}
                  r={getStockRadius(p.stockLevel)}
                  fill={getStockColor(p.stockLevel)}
                  stroke="white"
                  strokeWidth="2"
                />
              </g>
            ))}
          </g>

          {/* Dining */}
          <g
            onClick={() => handleZoneClick('showroom', 9)}
            onMouseEnter={(e) => showTooltip('Dining (Aisles 9-10)', e.clientX, e.clientY)}
            onMouseLeave={hideTooltip}
            className="cursor-pointer"
          >
            <rect
              x="420"
              y="80"
              width="110"
              height="100"
              fill={isHighlighted('showroom', 9) ? IKEA_YELLOW : '#E3F2FD'}
              fillOpacity="0.5"
              stroke={IKEA_BLUE}
              strokeWidth="2"
            />
            <text x="475" y="135" textAnchor="middle" fontSize="14" fontWeight="bold">
              Dining
            </text>
            {getProductsAtLocation('showroom', 9).map((p, i) => (
              <g
                key={p.id || `showroom-9-product-${i}`}
                onMouseEnter={(e) => showTooltip(formatProductTooltip(p), e.clientX, e.clientY)}
                onMouseLeave={hideTooltip}
                className="cursor-pointer"
              >
                {isOutOfStock(p.stockLevel) && (
                  <circle
                    cx={440 + i * 20}
                    cy={160}
                    r={getStockRadius(p.stockLevel) + 3}
                    fill={getStockColor(p.stockLevel)}
                    opacity="0.5"
                  >
                    <animate
                      attributeName="r"
                      from={getStockRadius(p.stockLevel) + 3}
                      to={getStockRadius(p.stockLevel) + 8}
                      dur="1.5s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      from="0.5"
                      to="0"
                      dur="1.5s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}
                <circle
                  cx={440 + i * 20}
                  cy={160}
                  r={getStockRadius(p.stockLevel)}
                  fill={getStockColor(p.stockLevel)}
                  stroke="white"
                  strokeWidth="2"
                />
              </g>
            ))}
          </g>

          {/* Children's Room */}
          <g
            onClick={() => handleZoneClick('showroom', 10)}
            onMouseEnter={(e) => showTooltip("Children's Room (Aisle 10)", e.clientX, e.clientY)}
            onMouseLeave={hideTooltip}
            className="cursor-pointer"
          >
            <rect
              x="420"
              y="230"
              width="110"
              height="150"
              fill={isHighlighted('showroom', 10) ? IKEA_YELLOW : '#FFF9C4'}
              fillOpacity="0.5"
              stroke={IKEA_BLUE}
              strokeWidth="2"
            />
            <text x="475" y="310" textAnchor="middle" fontSize="14" fontWeight="bold">
              Children
            </text>
            {getProductsAtLocation('showroom', 10).map((p, i) => (
              <g
                key={p.id || `showroom-10-product-${i}`}
                onMouseEnter={(e) => showTooltip(formatProductTooltip(p), e.clientX, e.clientY)}
                onMouseLeave={hideTooltip}
                className="cursor-pointer"
              >
                {isOutOfStock(p.stockLevel) && (
                  <circle
                    cx={440 + i * 20}
                    cy={360}
                    r={getStockRadius(p.stockLevel) + 3}
                    fill={getStockColor(p.stockLevel)}
                    opacity="0.5"
                  >
                    <animate
                      attributeName="r"
                      from={getStockRadius(p.stockLevel) + 3}
                      to={getStockRadius(p.stockLevel) + 8}
                      dur="1.5s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      from="0.5"
                      to="0"
                      dur="1.5s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}
                <circle
                  cx={440 + i * 20}
                  cy={360}
                  r={getStockRadius(p.stockLevel)}
                  fill={getStockColor(p.stockLevel)}
                  stroke="white"
                  strokeWidth="2"
                />
              </g>
            ))}
          </g>
        </g>

        {/* RESTAURANT (Top Right) */}
        <g aria-label="Restaurant">
          <rect x="600" y="50" width="550" height="150" fill="#FFE082" stroke={IKEA_BLUE} strokeWidth="3" />
          <text x="875" y="90" textAnchor="middle" fill={IKEA_BLUE} fontSize="22" fontWeight="bold">
            RESTAURANT
          </text>
          <circle cx="700" cy="140" r="15" fill={IKEA_BLUE} />
          <circle cx="800" cy="140" r="15" fill={IKEA_BLUE} />
          <circle cx="900" cy="140" r="15" fill={IKEA_BLUE} />
          <circle cx="1000" cy="140" r="15" fill={IKEA_BLUE} />
          <text x="875" y="120" textAnchor="middle" fontSize="12">
            Tables & Seating
          </text>
        </g>

        {/* MARKET HALL SECTION (Middle) */}
        <g aria-label="Market Hall">
          <rect x="600" y="220" width="550" height="280" fill={ROOM_WHITE} stroke={IKEA_BLUE} strokeWidth="3" />
          <text x="875" y="210" textAnchor="middle" fill={IKEA_BLUE} fontSize="24" fontWeight="bold">
            MARKET HALL
          </text>

          {/* Textiles Section */}
          <g
            onClick={() => handleZoneClick('market', 11)}
            onMouseEnter={(e) => showTooltip('Textiles (Aisles 11-13)', e.clientX, e.clientY)}
            onMouseLeave={hideTooltip}
            className="cursor-pointer"
          >
            <rect
              x="620"
              y="240"
              width="240"
              height="110"
              fill={isHighlighted('market', 11) ? IKEA_YELLOW : '#E8F5E9'}
              fillOpacity="0.6"
              stroke="#4CAF50"
              strokeWidth="2"
            />
            <text x="740" y="300" textAnchor="middle" fontSize="16" fontWeight="bold">
              Textiles
            </text>
            {getProductsAtLocation('market', 11).map((p, i) => (
              <g
                key={p.id || `market-11-product-${i}`}
                onMouseEnter={(e) => showTooltip(formatProductTooltip(p), e.clientX, e.clientY)}
                onMouseLeave={hideTooltip}
                className="cursor-pointer"
              >
                {isOutOfStock(p.stockLevel) && (
                  <circle
                    cx={640 + i * 20}
                    cy={330}
                    r={getStockRadius(p.stockLevel) + 3}
                    fill={getStockColor(p.stockLevel)}
                    opacity="0.5"
                  >
                    <animate
                      attributeName="r"
                      from={getStockRadius(p.stockLevel) + 3}
                      to={getStockRadius(p.stockLevel) + 8}
                      dur="1.5s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      from="0.5"
                      to="0"
                      dur="1.5s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}
                <circle
                  cx={640 + i * 20}
                  cy={330}
                  r={getStockRadius(p.stockLevel)}
                  fill={getStockColor(p.stockLevel)}
                  stroke="white"
                  strokeWidth="2"
                />
              </g>
            ))}
          </g>

          {/* Cookshop */}
          <g
            onClick={() => handleZoneClick('market', 14)}
            onMouseEnter={(e) => showTooltip('Cookshop (Aisles 14-16)', e.clientX, e.clientY)}
            onMouseLeave={hideTooltip}
            className="cursor-pointer"
          >
            <rect
              x="880"
              y="240"
              width="240"
              height="110"
              fill={isHighlighted('market', 14) ? IKEA_YELLOW : '#E8F5E9'}
              fillOpacity="0.6"
              stroke="#4CAF50"
              strokeWidth="2"
            />
            <text x="1000" y="300" textAnchor="middle" fontSize="16" fontWeight="bold">
              Cookshop
            </text>
            {getProductsAtLocation('market', 14).map((p, i) => (
              <g
                key={p.id || `market-14-product-${i}`}
                onMouseEnter={(e) => showTooltip(formatProductTooltip(p), e.clientX, e.clientY)}
                onMouseLeave={hideTooltip}
                className="cursor-pointer"
              >
                {isOutOfStock(p.stockLevel) && (
                  <circle
                    cx={900 + i * 20}
                    cy={330}
                    r={getStockRadius(p.stockLevel) + 3}
                    fill={getStockColor(p.stockLevel)}
                    opacity="0.5"
                  >
                    <animate
                      attributeName="r"
                      from={getStockRadius(p.stockLevel) + 3}
                      to={getStockRadius(p.stockLevel) + 8}
                      dur="1.5s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      from="0.5"
                      to="0"
                      dur="1.5s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}
                <circle
                  cx={900 + i * 20}
                  cy={330}
                  r={getStockRadius(p.stockLevel)}
                  fill={getStockColor(p.stockLevel)}
                  stroke="white"
                  strokeWidth="2"
                />
              </g>
            ))}
          </g>

          {/* Lighting */}
          <g
            onClick={() => handleZoneClick('market', 17)}
            onMouseEnter={(e) => showTooltip('Lighting (Aisles 17-18)', e.clientX, e.clientY)}
            onMouseLeave={hideTooltip}
            className="cursor-pointer"
          >
            <rect
              x="620"
              y="370"
              width="240"
              height="110"
              fill={isHighlighted('market', 17) ? IKEA_YELLOW : '#E8F5E9'}
              fillOpacity="0.6"
              stroke="#4CAF50"
              strokeWidth="2"
            />
            <text x="740" y="430" textAnchor="middle" fontSize="16" fontWeight="bold">
              Lighting
            </text>
            {getProductsAtLocation('market', 17).map((p, i) => (
              <g
                key={p.id || `market-17-product-${i}`}
                onMouseEnter={(e) => showTooltip(formatProductTooltip(p), e.clientX, e.clientY)}
                onMouseLeave={hideTooltip}
                className="cursor-pointer"
              >
                {isOutOfStock(p.stockLevel) && (
                  <circle
                    cx={640 + i * 20}
                    cy={460}
                    r={getStockRadius(p.stockLevel) + 3}
                    fill={getStockColor(p.stockLevel)}
                    opacity="0.5"
                  >
                    <animate
                      attributeName="r"
                      from={getStockRadius(p.stockLevel) + 3}
                      to={getStockRadius(p.stockLevel) + 8}
                      dur="1.5s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      from="0.5"
                      to="0"
                      dur="1.5s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}
                <circle
                  cx={640 + i * 20}
                  cy={460}
                  r={getStockRadius(p.stockLevel)}
                  fill={getStockColor(p.stockLevel)}
                  stroke="white"
                  strokeWidth="2"
                />
              </g>
            ))}
          </g>

          {/* Organization */}
          <g
            onClick={() => handleZoneClick('market', 19)}
            onMouseEnter={(e) => showTooltip('Organization (Aisles 19-20)', e.clientX, e.clientY)}
            onMouseLeave={hideTooltip}
            className="cursor-pointer"
          >
            <rect
              x="880"
              y="370"
              width="240"
              height="110"
              fill={isHighlighted('market', 19) ? IKEA_YELLOW : '#E8F5E9'}
              fillOpacity="0.6"
              stroke="#4CAF50"
              strokeWidth="2"
            />
            <text x="1000" y="430" textAnchor="middle" fontSize="16" fontWeight="bold">
              Organization
            </text>
            {getProductsAtLocation('market', 19).map((p, i) => (
              <g
                key={p.id || `market-19-product-${i}`}
                onMouseEnter={(e) => showTooltip(formatProductTooltip(p), e.clientX, e.clientY)}
                onMouseLeave={hideTooltip}
                className="cursor-pointer"
              >
                {isOutOfStock(p.stockLevel) && (
                  <circle
                    cx={900 + i * 20}
                    cy={460}
                    r={getStockRadius(p.stockLevel) + 3}
                    fill={getStockColor(p.stockLevel)}
                    opacity="0.5"
                  >
                    <animate
                      attributeName="r"
                      from={getStockRadius(p.stockLevel) + 3}
                      to={getStockRadius(p.stockLevel) + 8}
                      dur="1.5s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      from="0.5"
                      to="0"
                      dur="1.5s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}
                <circle
                  cx={900 + i * 20}
                  cy={460}
                  r={getStockRadius(p.stockLevel)}
                  fill={getStockColor(p.stockLevel)}
                  stroke="white"
                  strokeWidth="2"
                />
              </g>
            ))}
          </g>
        </g>

        {/* WAREHOUSE SECTION (Bottom - Grid Layout) */}
        <g aria-label="Warehouse">
          <rect x="50" y="520" width="1100" height="200" fill={WAREHOUSE_GRAY} fillOpacity="0.2" stroke={IKEA_BLUE} strokeWidth="3" />
          <text x="600" y="510" textAnchor="middle" fill={IKEA_BLUE} fontSize="24" fontWeight="bold">
            WAREHOUSE - SELF-SERVICE
          </text>

          {/* Warehouse Aisles (21-30) */}
          {Array.from({ length: 10 }, (_, i) => {
            const aisleNum = 21 + i;
            const x = 80 + i * 105;
            const highlighted = isHighlighted('warehouse', aisleNum);
            const productsHere = getProductsAtLocation('warehouse', aisleNum);

            return (
              <g
                key={aisleNum}
                onClick={() => handleZoneClick('warehouse', aisleNum)}
                onMouseEnter={(e) => showTooltip(`Aisle ${aisleNum}`, e.clientX, e.clientY)}
                onMouseLeave={hideTooltip}
                className="cursor-pointer"
              >
                {/* Aisle rectangle */}
                <rect
                  x={x}
                  y="540"
                  width="90"
                  height="160"
                  fill={highlighted ? IKEA_YELLOW : WAREHOUSE_GRAY}
                  fillOpacity={highlighted ? '0.8' : '0.4'}
                  stroke={highlighted ? IKEA_BLUE : '#757575'}
                  strokeWidth={highlighted ? '3' : '2'}
                />
                {/* Aisle number */}
                <text x={x + 45} y="565" textAnchor="middle" fontSize="18" fontWeight="bold">
                  {aisleNum}
                </text>
                {/* Bay markers */}
                {Array.from({ length: 5 }, (_, bay) => (
                  <rect
                    key={bay}
                    x={x + 10}
                    y={580 + bay * 22}
                    width="70"
                    height="18"
                    fill="white"
                    stroke="#999"
                    strokeWidth="1"
                  />
                ))}
                {/* Product markers */}
                {productsHere.slice(0, 3).map((p, idx) => (
                  <g
                    key={p.id || `warehouse-${aisleNum}-product-${idx}`}
                    onMouseEnter={(e) => showTooltip(formatProductTooltip(p), e.clientX, e.clientY)}
                    onMouseLeave={hideTooltip}
                    className="cursor-pointer"
                  >
                    {isOutOfStock(p.stockLevel) && (
                      <circle
                        cx={x + 45}
                        cy={640 + idx * 15}
                        r={getStockRadius(p.stockLevel) + 3}
                        fill={getStockColor(p.stockLevel)}
                        opacity="0.5"
                      >
                        <animate
                          attributeName="r"
                          from={getStockRadius(p.stockLevel) + 3}
                          to={getStockRadius(p.stockLevel) + 8}
                          dur="1.5s"
                          repeatCount="indefinite"
                        />
                        <animate
                          attributeName="opacity"
                          from="0.5"
                          to="0"
                          dur="1.5s"
                          repeatCount="indefinite"
                        />
                      </circle>
                    )}
                    <circle
                      cx={x + 45}
                      cy={640 + idx * 15}
                      r={getStockRadius(p.stockLevel)}
                      fill={getStockColor(p.stockLevel)}
                      stroke="white"
                      strokeWidth="2"
                    />
                  </g>
                ))}
              </g>
            );
          })}
        </g>

        {/* CHECKOUT (Bottom Left) */}
        <g aria-label="Checkout">
          <rect x="50" y="420" width="250" height="80" fill={IKEA_YELLOW} stroke={IKEA_BLUE} strokeWidth="3" />
          <text x="175" y="465" textAnchor="middle" fill={IKEA_BLUE} fontSize="20" fontWeight="bold">
            CHECKOUT
          </text>
          {/* Checkout lanes */}
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={65 + i * 55} y={475} width="40" height="15" fill={IKEA_BLUE} opacity="0.6" />
          ))}
        </g>

        {/* BISTRO (Bottom Right) */}
        <g aria-label="Bistro">
          <rect x="320" y="420" width="200" height="80" fill="#FFE082" stroke={IKEA_BLUE} strokeWidth="3" />
          <text x="420" y="465" textAnchor="middle" fill={IKEA_BLUE} fontSize="20" fontWeight="bold">
            SWEDISH BISTRO
          </text>
        </g>

        {/* EXIT Arrow */}
        <g aria-label="Exit">
          <rect x="150" y="720" width="200" height="30" fill={IKEA_BLUE} />
          <text x="250" y="740" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">
            EXIT →
          </text>
        </g>

        {/* Navigation Path Overlay */}
        {navigation.pathResult && navigation.pathResult.path.length > 1 && (
          <g aria-label="Navigation Path">
            {/* Path line */}
            <polyline
              points={navigation.pathResult.path.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke={IKEA_YELLOW}
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.9"
              strokeDasharray="10,5"
            />

            {/* Start marker */}
            <g>
              <circle
                cx={navigation.pathResult.path[0].x}
                cy={navigation.pathResult.path[0].y}
                r="12"
                fill="#10B981"
                stroke="white"
                strokeWidth="3"
              />
              <text
                x={navigation.pathResult.path[0].x}
                y={navigation.pathResult.path[0].y + 5}
                textAnchor="middle"
                fill="white"
                fontSize="14"
                fontWeight="bold"
              >
                A
              </text>
            </g>

            {/* End marker */}
            <g>
              <circle
                cx={navigation.pathResult.path[navigation.pathResult.path.length - 1].x}
                cy={navigation.pathResult.path[navigation.pathResult.path.length - 1].y}
                r="12"
                fill="#EF4444"
                stroke="white"
                strokeWidth="3"
              />
              <text
                x={navigation.pathResult.path[navigation.pathResult.path.length - 1].x}
                y={navigation.pathResult.path[navigation.pathResult.path.length - 1].y + 5}
                textAnchor="middle"
                fill="white"
                fontSize="14"
                fontWeight="bold"
              >
                B
              </text>
            </g>

            {/* Waypoint markers */}
            {navigation.pathResult.path.slice(1, -1).map((point, idx) => (
              <circle
                key={`waypoint-${idx}`}
                cx={point.x}
                cy={point.y}
                r="4"
                fill={IKEA_BLUE}
                stroke="white"
                strokeWidth="2"
              />
            ))}
          </g>
        )}
      </svg>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-20 bg-white rounded-lg shadow-md p-3 max-w-xs">
        <h3 className="font-bold text-sm mb-2">Map Legend</h3>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: IKEA_BLUE }}></div>
            <span>IKEA Areas</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: IKEA_YELLOW }}></div>
            <span>Highlighted/Selected</span>
          </div>
          <div className="border-t pt-1 mt-1 w-full"></div>
          <div className="font-semibold text-xs mb-1">Stock Levels:</div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#22c55e' }}></div>
            <span>In Stock (11+)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#f59e0b' }}></div>
            <span>Low Stock (1-10)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full relative" style={{ backgroundColor: '#ef4444' }}>
              <div className="absolute inset-0 rounded-full animate-ping" style={{ backgroundColor: '#ef4444', opacity: 0.5 }}></div>
            </div>
            <span>Out of Stock (0)</span>
          </div>
          <div className="border-t pt-1 mt-1 w-full"></div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#E3F2FD' }}></div>
            <span>Showroom</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#E8F5E9' }}></div>
            <span>Market Hall</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: WAREHOUSE_GRAY }}></div>
            <span>Warehouse</span>
          </div>
        </div>
      </div>

      {/* Product Selection Panel (when product is selected) */}
      {selectedProduct && !navigation.isNavigating && (
        <div className="absolute top-4 left-4 z-20 bg-white rounded-lg shadow-lg p-4 max-w-sm">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-bold text-base">Navigate to Product</h3>
              <p className="text-sm text-gray-600 mt-1">{selectedProduct.name || 'Product'}</p>
              <p className="text-xs text-gray-500 mt-1">
                {selectedProduct.zone.toUpperCase()}
                {selectedProduct.aisle && ` - Aisle ${selectedProduct.aisle}`}
                {selectedProduct.bay && `, Bay ${selectedProduct.bay}`}
                {selectedProduct.section && `, Section ${selectedProduct.section}`}
              </p>
            </div>
            <button
              onClick={() => setSelectedProduct(null)}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Select your current location:</p>
            {startLocations.map((loc) => (
              <button
                key={loc.id}
                onClick={() => handleStartNavigation(loc.id)}
                className="w-full text-left px-3 py-2 rounded bg-blue-50 hover:bg-blue-100 transition-colors text-sm"
              >
                {loc.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Navigation Directions Panel */}
      {navigation.isNavigating && navigation.pathResult && (
        <div className="absolute top-4 left-4 z-20 bg-white rounded-lg shadow-lg p-4 max-w-md max-h-96 overflow-y-auto">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-bold text-base">Directions</h3>
              <p className="text-sm text-gray-600 mt-1">
                {selectedProduct?.name || 'Destination'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Total distance: ~{Math.round(navigation.pathResult.distance)} units
              </p>
            </div>
            <button
              onClick={handleClearNavigation}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Close navigation"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-2">
            {navigation.pathResult.directions.map((direction) => (
              <div
                key={direction.step}
                className="flex gap-3 p-2 bg-gray-50 rounded text-sm"
              >
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">
                  {direction.step}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{direction.instruction}</p>
                  {direction.distance > 0 && (
                    <p className="text-xs text-gray-500 mt-1">~{direction.distance} units</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t">
            <div className="flex gap-2 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span>Start (A)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span>Destination (B)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Error */}
      {navigation.error && (
        <div className="absolute top-4 left-4 z-20 bg-red-50 border border-red-200 rounded-lg shadow-lg p-4 max-w-sm">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <h3 className="font-bold text-sm text-red-900">Navigation Error</h3>
              <p className="text-sm text-red-700 mt-1">{navigation.error}</p>
            </div>
            <button
              onClick={() => navigation.clearNavigation()}
              className="text-red-400 hover:text-red-600"
              aria-label="Close error"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Product "Navigate" buttons on markers */}
      {showProductDirectory && products.length > 0 && !navigation.isNavigating && (
        <div className="absolute bottom-20 left-4 z-20 bg-white rounded-lg shadow-md p-3 max-w-xs">
          <h3 className="font-bold text-sm mb-2">Products on Map</h3>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {products.map((product, navIdx) => (
              <button
                key={product.id || `nav-product-${navIdx}`}
                onClick={() => handleNavigateToProduct(product)}
                className="w-full text-left px-2 py-1.5 rounded hover:bg-blue-50 transition-colors text-xs flex items-center justify-between group"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: getStockColor(product.stockLevel) }}
                  ></div>
                  <span className="font-medium">{product.name || product.id}</span>
                </div>
                <svg className="w-4 h-4 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useMemo } from 'react';
import { type Product3D, IKEA_YELLOW, IKEA_BLUE } from './types';
import { Text, Sphere } from '@react-three/drei';
import * as THREE from 'three';

interface ProductMarkerProps {
  product: Product3D;
  onSelect?: (product: Product3D) => void;
  isSelected?: boolean;
}

export function ProductMarker3D({ product, onSelect, isSelected = false }: ProductMarkerProps) {
  const [hovered, setHovered] = useState(false);
  const scale = isSelected ? 1.5 : hovered ? 1.2 : 1;

  // Pulsing animation for selected product
  const pulseSpeed = 2;

  return (
    <group position={product.position}>
      {/* Marker sphere */}
      <Sphere
        args={[0.3, 16, 16]}
        scale={scale}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={() => onSelect?.(product)}
      >
        <meshStandardMaterial
          color={isSelected ? IKEA_YELLOW : IKEA_BLUE}
          emissive={isSelected ? IKEA_YELLOW : IKEA_BLUE}
          emissiveIntensity={isSelected ? 0.8 : 0.3}
          roughness={0.2}
          metalness={0.8}
        />
      </Sphere>

      {/* Vertical line connecting to ground */}
      {isSelected && (
        <mesh position={[0, -product.position[1] / 2, 0]}>
          <cylinderGeometry args={[0.05, 0.05, product.position[1], 8]} />
          <meshBasicMaterial color={IKEA_YELLOW} opacity={0.5} transparent />
        </mesh>
      )}

      {/* Product label */}
      {(hovered || isSelected) && (
        <group position={[0, 1, 0]}>
          {/* Background panel */}
          <mesh position={[0, 0, -0.01]}>
            <planeGeometry args={[4, 1.5]} />
            <meshBasicMaterial color={IKEA_BLUE} opacity={0.9} transparent />
          </mesh>

          {/* Product name */}
          <Text
            position={[0, 0.3, 0]}
            fontSize={0.4}
            color="white"
            anchorX="center"
            anchorY="middle"
            maxWidth={3.5}
          >
            {product.name}
          </Text>

          {/* Location info */}
          <Text
            position={[0, -0.3, 0]}
            fontSize={0.25}
            color={IKEA_YELLOW}
            anchorX="center"
            anchorY="middle"
          >
            {product.aisle} • Shelf {product.shelf}
          </Text>
        </group>
      )}

      {/* Selection indicator ring */}
      {isSelected && (
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
          <ringGeometry args={[0.8, 1, 32]} />
          <meshBasicMaterial color={IKEA_YELLOW} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

interface ProductMarkersProps {
  products: Product3D[];
  selectedProduct?: string | null;
  onSelectProduct?: (product: Product3D) => void;
  currentFloor?: number;
}

export function ProductMarkers({
  products,
  selectedProduct,
  onSelectProduct,
  currentFloor
}: ProductMarkersProps) {
  // Filter products by current floor if specified
  const visibleProducts = useMemo(() => {
    if (currentFloor === undefined) return products;
    return products.filter(p => p.floor === currentFloor);
  }, [products, currentFloor]);

  return (
    <group>
      {visibleProducts.map((product) => (
        <ProductMarker3D
          key={product.id}
          product={product}
          onSelect={onSelectProduct}
          isSelected={selectedProduct === product.id}
        />
      ))}
    </group>
  );
}

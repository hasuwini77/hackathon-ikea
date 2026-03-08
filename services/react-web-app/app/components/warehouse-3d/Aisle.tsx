import { useState } from 'react';
import { type Aisle3D, ZONE_COLORS } from './types';
import * as THREE from 'three';
import { Text } from '@react-three/drei';

interface AisleProps {
  aisle: Aisle3D;
  onSelect?: (aisle: Aisle3D) => void;
  isSelected?: boolean;
}

export function Aisle({ aisle, onSelect, isSelected = false }: AisleProps) {
  const [hovered, setHovered] = useState(false);
  const [width, height, depth] = aisle.size;
  const zoneColor = ZONE_COLORS[aisle.zone];

  const emissiveIntensity = isSelected ? 0.5 : hovered ? 0.3 : 0;

  return (
    <group position={aisle.position}>
      {/* Main shelf unit */}
      <mesh
        castShadow
        receiveShadow
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={() => onSelect?.(aisle)}
      >
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial
          color={zoneColor}
          emissive={zoneColor}
          emissiveIntensity={emissiveIntensity}
          roughness={0.7}
          metalness={0.3}
        />
      </mesh>

      {/* Shelf dividers */}
      {Array.from({ length: aisle.shelfCount - 1 }).map((_, i) => {
        const shelfY = (-height / 2) + ((height / aisle.shelfCount) * (i + 1));
        return (
          <mesh key={i} position={[0, shelfY, 0]}>
            <boxGeometry args={[width, 0.1, depth]} />
            <meshStandardMaterial color="#ffffff" opacity={0.3} transparent />
          </mesh>
        );
      })}

      {/* Aisle label */}
      {(hovered || isSelected) && (
        <Text
          position={[0, height / 2 + 1, 0]}
          fontSize={1}
          color="white"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.1}
          outlineColor="#000000"
        >
          {aisle.id}
        </Text>
      )}

      {/* Yellow accent strip (IKEA style) */}
      <mesh position={[0, -height / 2, depth / 2 + 0.05]}>
        <boxGeometry args={[width, 0.5, 0.1]} />
        <meshStandardMaterial color="#FFDB00" />
      </mesh>
    </group>
  );
}

interface AislesProps {
  aisles: Aisle3D[];
  selectedAisle?: string | null;
  onSelectAisle?: (aisle: Aisle3D) => void;
}

export function Aisles({ aisles, selectedAisle, onSelectAisle }: AislesProps) {
  return (
    <group>
      {aisles.map((aisle) => (
        <Aisle
          key={aisle.id}
          aisle={aisle}
          onSelect={onSelectAisle}
          isSelected={selectedAisle === aisle.id}
        />
      ))}
    </group>
  );
}

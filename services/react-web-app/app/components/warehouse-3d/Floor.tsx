import { Grid } from '@react-three/drei';
import { type Floor3D, IKEA_BLUE, IKEA_YELLOW } from './types';

interface FloorProps {
  floor: Floor3D;
  active?: boolean;
}

export function Floor({ floor, active = true }: FloorProps) {
  const [width, depth] = floor.size;
  const opacity = active ? 0.8 : 0.2;

  return (
    <group position={[0, floor.height, 0]}>
      {/* Main floor plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial
          color="#f5f5f5"
          opacity={opacity}
          transparent
        />
      </mesh>

      {/* Grid lines */}
      {active && (
        <Grid
          args={[width, depth]}
          cellSize={5}
          cellThickness={0.5}
          cellColor={IKEA_BLUE}
          sectionSize={20}
          sectionThickness={1}
          sectionColor={IKEA_YELLOW}
          fadeDistance={200}
          fadeStrength={1}
          position={[0, 0.01, 0]}
        />
      )}

      {/* Floor label */}
      {active && (
        <mesh position={[0, 0.02, depth / 2 - 5]}>
          <planeGeometry args={[15, 3]} />
          <meshBasicMaterial color={IKEA_BLUE} />
        </mesh>
      )}
    </group>
  );
}

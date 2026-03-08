import { useState, useMemo, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Sky, Environment, PerspectiveCamera } from '@react-three/drei';
import { Floor } from './Floor';
import { Aisles } from './Aisle';
import { ProductMarkers } from './ProductMarker3D';
import { CameraControls, FirstPersonControls } from './CameraControls';
import {
  type Aisle3D,
  type Product3D,
  type Floor3D,
  IKEA_BLUE,
  IKEA_YELLOW,
} from './types';
import * as THREE from 'three';

interface Warehouse3DProps {
  aisles?: Aisle3D[];
  products?: Product3D[];
  floors?: Floor3D[];
  initialFloor?: number;
  enableFirstPerson?: boolean;
}

// Generate sample warehouse data
function generateWarehouseData(): {
  aisles: Aisle3D[];
  products: Product3D[];
  floors: Floor3D[];
} {
  const floors: Floor3D[] = [
    {
      id: 0,
      name: 'Ground Floor - Showroom',
      height: 0,
      size: [100, 80],
      zones: { showroom: true, market: true, warehouse: false },
    },
    {
      id: 1,
      name: 'First Floor - Warehouse',
      height: 15,
      size: [100, 80],
      zones: { showroom: false, market: false, warehouse: true },
    },
    {
      id: 2,
      name: 'Second Floor - Storage',
      height: 30,
      size: [80, 60],
      zones: { showroom: false, market: false, warehouse: true },
    },
  ];

  const aisles: Aisle3D[] = [];
  const products: Product3D[] = [];

  // Ground floor - Showroom aisles (blue)
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 3; j++) {
      aisles.push({
        id: `A-${i + 1}-${j + 1}`,
        position: [-40 + i * 20, 4, -25 + j * 20],
        size: [8, 8, 3],
        zone: 'showroom',
        floor: 0,
        shelfCount: 4,
      });
    }
  }

  // Ground floor - Market aisles (green)
  for (let i = 0; i < 3; i++) {
    aisles.push({
      id: `M-${i + 1}`,
      position: [25 + i * 12, 4, -10],
      size: [6, 8, 20],
      zone: 'market',
      floor: 0,
      shelfCount: 5,
    });
  }

  // First floor - Warehouse aisles (orange)
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 4; j++) {
      aisles.push({
        id: `W-${i + 1}-${j + 1}`,
        position: [-40 + i * 20, 15 + 6, -25 + j * 15],
        size: [10, 12, 4],
        zone: 'warehouse',
        floor: 1,
        shelfCount: 6,
      });
    }
  }

  // Second floor - Storage aisles (orange)
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 3; j++) {
      aisles.push({
        id: `S-${i + 1}-${j + 1}`,
        position: [-30 + i * 20, 30 + 6, -20 + j * 15],
        size: [10, 12, 4],
        zone: 'warehouse',
        floor: 2,
        shelfCount: 6,
      });
    }
  }

  // Add sample products
  const productNames = [
    'BILLY Bookcase',
    'KALLAX Shelf Unit',
    'MALM Bed Frame',
    'POÄNG Armchair',
    'LACK Side Table',
    'HEMNES Dresser',
    'EKTORP Sofa',
    'PAX Wardrobe',
    'LISABO Table',
    'STOCKHOLM Cabinet',
  ];

  // Add products to various aisles
  aisles.forEach((aisle, index) => {
    if (index % 2 === 0) {
      const [x, y, z] = aisle.position;
      const shelfLevel = Math.floor(Math.random() * aisle.shelfCount) + 1;
      const shelfHeight = (aisle.size[1] / aisle.shelfCount) * shelfLevel - aisle.size[1] / 2;

      products.push({
        id: `P-${index}`,
        name: productNames[index % productNames.length],
        position: [
          x + (Math.random() - 0.5) * 3,
          y + shelfHeight,
          z + (Math.random() - 0.5) * 2,
        ],
        aisle: aisle.id,
        shelf: shelfLevel,
        zone: aisle.zone,
        floor: aisle.floor,
      });
    }
  });

  return { aisles, products, floors };
}

function Scene({
  aisles,
  products,
  floors,
  currentFloor,
  selectedProduct,
  selectedAisle,
  onSelectProduct,
  onSelectAisle,
  firstPersonMode,
}: {
  aisles: Aisle3D[];
  products: Product3D[];
  floors: Floor3D[];
  currentFloor: number;
  selectedProduct: string | null;
  selectedAisle: string | null;
  onSelectProduct: (product: Product3D) => void;
  onSelectAisle: (aisle: Aisle3D) => void;
  firstPersonMode: boolean;
}) {
  // Filter aisles by current floor
  const visibleAisles = useMemo(
    () => aisles.filter((a) => a.floor === currentFloor),
    [aisles, currentFloor]
  );

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[50, 50, 25]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={200}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
      />
      <pointLight position={[0, 20, 0]} intensity={0.5} color={IKEA_YELLOW} />
      <pointLight position={[-30, 20, -30]} intensity={0.3} />
      <pointLight position={[30, 20, 30]} intensity={0.3} />

      {/* Environment */}
      <Sky sunPosition={[100, 20, 100]} />
      <Environment preset="warehouse" />
      <fog attach="fog" args={['#f0f0f0', 50, 200]} />

      {/* Floors */}
      {floors.map((floor) => (
        <Floor
          key={floor.id}
          floor={floor}
          active={floor.id === currentFloor}
        />
      ))}

      {/* Aisles */}
      <Aisles
        aisles={visibleAisles}
        selectedAisle={selectedAisle}
        onSelectAisle={onSelectAisle}
      />

      {/* Products */}
      <ProductMarkers
        products={products}
        selectedProduct={selectedProduct}
        onSelectProduct={onSelectProduct}
        currentFloor={currentFloor}
      />

      {/* Camera Controls */}
      {firstPersonMode ? (
        <FirstPersonControls
          position={[0, floors[currentFloor].height + 5, 30]}
        />
      ) : (
        <CameraControls
          target={[0, floors[currentFloor].height, 0]}
          minDistance={10}
          maxDistance={120}
        />
      )}
    </>
  );
}

export function Warehouse3D({
  aisles: propAisles,
  products: propProducts,
  floors: propFloors,
  initialFloor = 0,
  enableFirstPerson = true,
}: Warehouse3DProps) {
  const [currentFloor, setCurrentFloor] = useState(initialFloor);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [selectedAisle, setSelectedAisle] = useState<string | null>(null);
  const [firstPersonMode, setFirstPersonMode] = useState(false);

  // Generate or use provided data
  const warehouseData = useMemo(() => {
    if (propAisles && propProducts && propFloors) {
      return { aisles: propAisles, products: propProducts, floors: propFloors };
    }
    return generateWarehouseData();
  }, [propAisles, propProducts, propFloors]);

  const { aisles, products, floors } = warehouseData;

  const handleSelectProduct = (product: Product3D) => {
    setSelectedProduct(product.id);
    setSelectedAisle(product.aisle);
    if (product.floor !== currentFloor) {
      setCurrentFloor(product.floor);
    }
  };

  const handleSelectAisle = (aisle: Aisle3D) => {
    setSelectedAisle(aisle.id);
    setSelectedProduct(null);
  };

  return (
    <div className="relative w-full h-full">
      {/* 3D Canvas */}
      <Canvas
        shadows
        className="w-full h-full"
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
      >
        <PerspectiveCamera makeDefault position={[40, 30, 40]} fov={60} />
        <Suspense fallback={null}>
          <Scene
            aisles={aisles}
            products={products}
            floors={floors}
            currentFloor={currentFloor}
            selectedProduct={selectedProduct}
            selectedAisle={selectedAisle}
            onSelectProduct={handleSelectProduct}
            onSelectAisle={handleSelectAisle}
            firstPersonMode={firstPersonMode}
          />
        </Suspense>
      </Canvas>

      {/* UI Controls */}
      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur rounded-lg shadow-lg p-4 space-y-4">
        <div>
          <h3 className="font-bold text-sm mb-2" style={{ color: IKEA_BLUE }}>
            Floor Selection
          </h3>
          <div className="flex gap-2">
            {floors.map((floor) => (
              <button
                key={floor.id}
                onClick={() => setCurrentFloor(floor.id)}
                className={`px-3 py-2 rounded text-xs font-medium transition-colors ${
                  currentFloor === floor.id
                    ? 'text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                style={{
                  backgroundColor:
                    currentFloor === floor.id ? IKEA_BLUE : undefined,
                }}
              >
                Floor {floor.id}
              </button>
            ))}
          </div>
        </div>

        {enableFirstPerson && (
          <div>
            <h3 className="font-bold text-sm mb-2" style={{ color: IKEA_BLUE }}>
              Camera Mode
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => setFirstPersonMode(false)}
                className={`px-3 py-2 rounded text-xs font-medium transition-colors ${
                  !firstPersonMode
                    ? 'text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                style={{
                  backgroundColor: !firstPersonMode ? IKEA_BLUE : undefined,
                }}
              >
                Orbit
              </button>
              <button
                onClick={() => setFirstPersonMode(true)}
                className={`px-3 py-2 rounded text-xs font-medium transition-colors ${
                  firstPersonMode
                    ? 'text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                style={{
                  backgroundColor: firstPersonMode ? IKEA_BLUE : undefined,
                }}
              >
                First Person
              </button>
            </div>
            {firstPersonMode && (
              <p className="text-xs text-gray-600 mt-2">
                WASD to move, QE for up/down, mouse to look
              </p>
            )}
          </div>
        )}
      </div>

      {/* Selected Item Info */}
      {selectedProduct && (
        <div
          className="absolute top-4 right-4 bg-white/90 backdrop-blur rounded-lg shadow-lg p-4 max-w-xs"
        >
          <h3 className="font-bold text-sm mb-2" style={{ color: IKEA_BLUE }}>
            Selected Product
          </h3>
          {products.find((p) => p.id === selectedProduct) && (
            <div className="text-sm space-y-1">
              <p className="font-medium">
                {products.find((p) => p.id === selectedProduct)?.name}
              </p>
              <p className="text-gray-600">
                Aisle: {products.find((p) => p.id === selectedProduct)?.aisle}
              </p>
              <p className="text-gray-600">
                Shelf: {products.find((p) => p.id === selectedProduct)?.shelf}
              </p>
              <p className="text-gray-600">
                Floor: {products.find((p) => p.id === selectedProduct)?.floor}
              </p>
              <button
                onClick={() => setSelectedProduct(null)}
                className="mt-2 px-3 py-1 rounded text-xs font-medium text-white"
                style={{ backgroundColor: IKEA_BLUE }}
              >
                Clear Selection
              </button>
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur rounded-lg shadow-lg p-4">
        <h3 className="font-bold text-sm mb-2" style={{ color: IKEA_BLUE }}>
          Zone Legend
        </h3>
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: '#0051BA' }}
            />
            <span>Showroom</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: '#009A44' }}
            />
            <span>Market</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: '#FF9900' }}
            />
            <span>Warehouse</span>
          </div>
        </div>
      </div>
    </div>
  );
}

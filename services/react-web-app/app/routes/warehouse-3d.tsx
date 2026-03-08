import type { Route } from "./+types/warehouse-3d";
import { Warehouse3D } from "~/components/warehouse-3d";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "3D Warehouse Visualization - IKEA" },
    { name: "description", content: "Navigate the IKEA warehouse in 3D" },
  ];
}

export default function Warehouse3DRoute() {
  return (
    <div className="w-full h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-[#0051BA] text-white shadow-md z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">IKEA</h1>
            <span className="text-sm opacity-90">3D Warehouse Navigator</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="/"
              className="px-4 py-2 bg-[#FFDB00] text-[#0051BA] rounded font-medium hover:bg-yellow-300 transition-colors"
            >
              Back to Home
            </a>
          </div>
        </div>
      </header>

      {/* 3D Warehouse View */}
      <div className="flex-1 relative">
        <Warehouse3D enableFirstPerson={true} />
      </div>

      {/* Instructions Panel */}
      <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur rounded-lg shadow-lg p-4 max-w-sm">
        <h3 className="font-bold text-sm mb-2 text-[#0051BA]">
          How to Navigate
        </h3>
        <div className="text-xs space-y-2 text-gray-700">
          <div>
            <p className="font-medium">Orbit Mode (default):</p>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li>Left click + drag to rotate</li>
              <li>Right click + drag to pan</li>
              <li>Scroll to zoom</li>
              <li>Click products or aisles to select</li>
            </ul>
          </div>
          <div>
            <p className="font-medium">First Person Mode:</p>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li>WASD or Arrow keys to move</li>
              <li>Q/E to move up/down</li>
              <li>Mouse to look around (click to lock)</li>
              <li>Click products or aisles to select</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

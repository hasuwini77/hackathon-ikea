import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { Home, ScanBarcode, Map, Package } from "lucide-react";
import { Toaster } from "sonner";
import { SyncStatus } from "~/components/SyncStatus";
import { MeshStatus } from "~/components/MeshStatus";
import { cn } from "~/lib/utils";

/**
 * AppShell Component
 *
 * Provides a mobile-first layout with:
 * - Top header with SyncStatus and app title
 * - Bottom navigation bar with 4 main sections
 * - Touch-friendly 44px minimum tap targets
 * - Active state highlighting with IKEA blue
 * - Safe area padding for mobile devices
 */

interface NavItem {
  to: string;
  icon: typeof Home;
  label: string;
}

const navItems: NavItem[] = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/scan", icon: ScanBarcode, label: "Scan" },
  { to: "/map", icon: Map, label: "Map" },
  { to: "/stock", icon: Package, label: "Stock" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();

  // Global keyboard navigation for tabs (1-4 keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't interfere with input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // Number keys 1-4 for navigation
      const navRoutes = ['/', '/scan', '/map', '/stock'];
      const keyNum = parseInt(e.key);
      if (keyNum >= 1 && keyNum <= 4) {
        e.preventDefault();
        navigate(navRoutes[keyNum - 1]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  return (
    <div className="flex flex-col h-screen">
      {/* Top Header */}
      <header className="shrink-0">
        <MeshStatus />
        <SyncStatus />
        <div className="bg-[#0058A3] text-white px-4 py-3 shadow-md flex items-center justify-between">
          <h1 className="text-lg font-semibold tracking-tight">IKEA AXIS</h1>
          <span className="text-[10px] font-mono text-blue-200 uppercase tracking-widest">
            Absolute Operational Continuity
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto bg-background">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="shrink-0 bg-white dark:bg-gray-900 border-t border-border shadow-lg safe-area-inset-bottom">
        <div className="flex justify-around items-stretch h-16 pb-safe">
          {navItems.map(({ to, icon: Icon, label }) => {
            const isActive = location.pathname === to;

            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 min-w-0 gap-1",
                  "transition-colors duration-200",
                  "min-h-[44px]", // Touch-friendly minimum tap target
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                  isActive
                    ? "text-[#0058A3] dark:text-[#4A9EFF]" // IKEA blue for active state
                    : "text-muted-foreground hover:text-foreground"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon
                  className={cn(
                    "h-6 w-6 shrink-0",
                    isActive && "scale-110"
                  )}
                  aria-hidden="true"
                />
                <span
                  className={cn(
                    "text-xs font-medium truncate max-w-full px-1",
                    isActive && "font-semibold"
                  )}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Toast notifications */}
      <Toaster position="top-center" richColors />
    </div>
  );
}

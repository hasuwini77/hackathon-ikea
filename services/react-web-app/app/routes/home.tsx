import type { Route } from "./+types/home";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import { ScanBarcode, Map, Package, Wifi, WifiOff, Clock, ShoppingBag, Box } from "lucide-react";
import { useSyncStatus } from "~/lib/couchbase";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "IKEA Staff Finder" },
    { name: "description", content: "Offline-first product finder for IKEA store staff" },
  ];
}

export default function Home() {
  const { isOnline, lastSynced } = useSyncStatus();

  const formatLastSync = (date?: Date) => {
    if (!date) return "Never";
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins === 1) return "1 minute ago";
    if (diffMins < 60) return `${diffMins} minutes ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return "1 hour ago";
    if (diffHours < 24) return `${diffHours} hours ago`;

    return date.toLocaleDateString();
  };

  const quickActions = [
    {
      title: "Browse Products",
      description: "Search and explore product catalog",
      icon: ShoppingBag,
      to: "/products",
      bgColor: "bg-[#0058A3]",
      hoverColor: "hover:bg-[#004182]",
    },
    {
      title: "Scan Product",
      description: "Scan barcode to find product location",
      icon: ScanBarcode,
      to: "/scan",
      bgColor: "bg-[#0058A3]",
      hoverColor: "hover:bg-[#004182]",
    },
    {
      title: "View Map",
      description: "Browse store layout and locations",
      icon: Map,
      to: "/map",
      bgColor: "bg-[#0058A3]",
      hoverColor: "hover:bg-[#004182]",
    },
    {
      title: "3D Warehouse",
      description: "Navigate warehouse in 3D view",
      icon: Box,
      to: "/warehouse-3d",
      bgColor: "bg-[#0058A3]",
      hoverColor: "hover:bg-[#004182]",
    },
    {
      title: "Stock Overview",
      description: "Check inventory levels",
      icon: Package,
      to: "/stock",
      bgColor: "bg-[#0058A3]",
      hoverColor: "hover:bg-[#004182]",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Find products quickly, even offline
          </p>
        </div>

        {/* Status Card */}
        <Card className="border-2">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                {isOnline ? (
                  <Wifi className="h-5 w-5 text-green-600" />
                ) : (
                  <WifiOff className="h-5 w-5 text-orange-600" />
                )}
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {isOnline ? "Online" : "Offline Mode"}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Clock className="h-4 w-4" />
                    <span>Last sync: {formatLastSync(lastSynced)}</span>
                  </div>
                </div>
              </div>
              <Badge
                variant="secondary"
                className="bg-[#FFDB00] text-gray-900 hover:bg-[#FFDB00] font-semibold"
              >
                Works Offline
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.to} to={action.to} className="block group">
                <Card className={`${action.bgColor} ${action.hoverColor} text-white border-0 transition-all duration-200 h-full group-hover:scale-105 group-hover:shadow-lg`}>
                  <CardHeader className="text-center pb-4">
                    <div className="mx-auto mb-4 w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                      <Icon className="h-8 w-8" />
                    </div>
                    <CardTitle className="text-2xl">{action.title}</CardTitle>
                    <CardDescription className="text-white/90 text-base">
                      {action.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Info Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Getting Started</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-gray-600 dark:text-gray-400">
              <li className="flex items-start gap-3">
                <ShoppingBag className="h-5 w-5 mt-0.5 text-[#0058A3] flex-shrink-0" />
                <span>Browse the complete product catalog with advanced filters and search</span>
              </li>
              <li className="flex items-start gap-3">
                <ScanBarcode className="h-5 w-5 mt-0.5 text-[#0058A3] flex-shrink-0" />
                <span>Scan a product barcode to instantly find its location in the store</span>
              </li>
              <li className="flex items-start gap-3">
                <Map className="h-5 w-5 mt-0.5 text-[#0058A3] flex-shrink-0" />
                <span>Browse the interactive map to see all product locations</span>
              </li>
              <li className="flex items-start gap-3">
                <Box className="h-5 w-5 mt-0.5 text-[#0058A3] flex-shrink-0" />
                <span>Explore the warehouse in immersive 3D with orbit and first-person controls</span>
              </li>
              <li className="flex items-start gap-3">
                <Package className="h-5 w-5 mt-0.5 text-[#0058A3] flex-shrink-0" />
                <span>Check stock levels and manage inventory</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

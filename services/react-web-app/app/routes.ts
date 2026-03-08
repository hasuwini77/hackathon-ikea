import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("scan", "routes/scan.tsx"),
  route("map", "routes/map.tsx"),
  route("stock", "routes/stock.tsx"),
  route("products", "routes/products.tsx"),
  route("warehouse-3d", "routes/warehouse-3d.tsx"),
] satisfies RouteConfig;

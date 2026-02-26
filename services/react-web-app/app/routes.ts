import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("counter", "routes/stock.tsx"),
] satisfies RouteConfig;

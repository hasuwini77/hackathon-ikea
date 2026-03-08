# IKEA Product Finder - Task Breakdown

**Version:** 1.0
**Date:** 2026-03-03
**Status:** Active

## Overview

This document provides a detailed breakdown of all tasks required to deliver the IKEA Staff Product Finder application. The work is organized into three phases prioritized by business value and technical dependencies.

**Priority Levels:**
- **Phase 1 (MVP)**: Critical path items needed for a working demo with core offline-first functionality
- **Phase 2 (Enhanced)**: Features that improve usability, security, and operational efficiency
- **Phase 3 (Future)**: Advanced features for long-term competitive advantage

**Complexity Estimation:**
- **S (Small)**: 1-4 hours
- **M (Medium)**: 4-16 hours (0.5-2 days)
- **L (Large)**: 16-40 hours (2-5 days)
- **XL (Extra Large)**: 40+ hours (5+ days)

---

## Phase 1: MVP (Critical Path)

### Epic 1.1: Data Layer Foundation

**Goal**: Establish a stable, consistent data layer with proper schema alignment and data seeding capabilities.

#### Task 1.1.1: Align TypeScript and Python Product Schemas
**Description**: Fix schema mismatches between frontend TypeScript types and backend Pydantic models to prevent runtime errors.

**Acceptance Criteria**:
- TypeScript `Product` interface matches Python `Product` Pydantic model exactly
- Frontend uses `location.aisle: number` (not string)
- Frontend uses `stock: number` (not nested `stock.quantity`)
- Field naming consistent (camelCase in TypeScript maps to snake_case aliases in Python)
- All optional fields match between implementations

**Complexity**: M
**Dependencies**: None
**Files to Modify**:
- `/services/react-web-app/app/types/product.ts`
- `/models/python/models/entities/product.py` (validate only)

---

#### Task 1.1.2: Create Data Seeding Script for Edge Server
**Description**: Build a script that loads the 220-product dataset into Couchbase Edge Server with proper document structure.

**Acceptance Criteria**:
- Script reads from `/scripts/data/products.json`
- Creates documents with ID format `product:XXX.XXX.XX`
- Includes all required fields: `_id`, `type`, `articleNumber`, `name`, `description`, `location`, `stock`, `price`, `currency`, `category`, `imageUrl`
- Adds metadata fields: `lastStockCheck`, `_syncedAt`, `_pendingSync: false`
- Validates all documents against Pydantic schema before insertion
- Provides progress output (e.g., "Seeded 50/220 products")
- Handles errors gracefully (duplicate IDs, validation failures)
- Idempotent (can be run multiple times safely)

**Complexity**: M
**Dependencies**: Task 1.1.1
**New Files**:
- `/scripts/seed-database.py`

---

#### Task 1.1.3: Implement Couchbase Edge Server Health Check
**Description**: Create a utility function to check if Edge Server is running and accessible.

**Acceptance Criteria**:
- Function pings Edge Server endpoint (`GET /_all_dbs` or similar)
- Returns boolean: `true` if healthy, `false` if unreachable
- Timeout after 2 seconds
- Used by React app on startup to show error if Edge Server down
- Logs connection errors to console with helpful troubleshooting message

**Complexity**: S
**Dependencies**: None
**Files to Modify**:
- `/services/react-web-app/app/lib/couchbase/client.ts`

---

#### Task 1.1.4: Remove Duplicate Hook Implementations
**Description**: Consolidate duplicate `useProducts` hooks to avoid confusion and ensure consistent behavior.

**Acceptance Criteria**:
- Delete mock implementation: `/services/react-web-app/app/hooks/use-products.ts`
- Keep real Couchbase implementation: `/services/react-web-app/app/lib/couchbase/hooks/useProducts.ts`
- Update all imports across app to use the real hook
- Verify no references to old mock hook remain
- App uses Couchbase Edge Server for all product queries

**Complexity**: S
**Dependencies**: Task 1.1.2 (need seeded data first)
**Files to Modify**:
- Delete: `/services/react-web-app/app/hooks/use-products.ts`
- Update imports in all route components

---

#### Task 1.1.5: Implement Product Document CRUD Operations
**Description**: Ensure all basic CRUD operations work correctly for product documents via Couchbase Edge Server REST API.

**Acceptance Criteria**:
- `getAllProducts()`: Fetches all products from Edge Server, filters by `type: "product"`
- `getProductById(id: string)`: Fetches single product by document ID
- `getProductByArticleNumber(articleNumber: string)`: Finds product by article number
- `updateProduct(id: string, updates: Partial<Product>)`: Updates product fields, increments `_rev`
- `updateStockLevel(id: string, newStock: number)`: Specifically updates stock with timestamp
- All functions handle 404 errors gracefully (return null or empty array)
- All functions retry 3 times on network errors with exponential backoff
- All functions have proper TypeScript typing

**Complexity**: M
**Dependencies**: Task 1.1.1
**Files to Modify**:
- `/services/react-web-app/app/lib/couchbase/client.ts`

---

### Epic 1.2: Core Search & Display

**Goal**: Deliver fast, reliable product search and display functionality with offline support.

#### Task 1.2.1: Integrate Real Couchbase Data into Product Search
**Description**: Replace mock data in search component with real queries to Couchbase Edge Server.

**Acceptance Criteria**:
- Search queries Couchbase via `useProducts` hook (from Epic 1.1)
- Debounced search (300ms) triggers new query
- Minimum 2 characters required for search
- Search matches: `name`, `description`, `articleNumber`, `category` (case-insensitive)
- Empty search returns all products
- Shows result count: "Showing X products"
- Loading state displayed during query
- Error state shown if query fails

**Complexity**: M
**Dependencies**: Task 1.1.4, Task 1.1.5
**Files to Modify**:
- `/services/react-web-app/app/components/product-search.tsx`
- `/services/react-web-app/app/routes/_index/route.tsx`

---

#### Task 1.2.2: Implement Barcode Format Validation
**Description**: Add robust validation for article number format XXX.XXX.XX with clear error messaging.

**Acceptance Criteria**:
- Validates format: 3 digits, dot, 3 digits, dot, 2 digits (`/^\d{3}\.\d{3}\.\d{2}$/`)
- Real-time validation as user types
- Red border on input if invalid
- Error message: "Expected format: XXX.XXX.XX (e.g., 123.456.78)"
- Error clears when user corrects input
- Submit button disabled if invalid format
- Pressing Enter submits if valid

**Complexity**: S
**Dependencies**: None
**Files to Modify**:
- `/services/react-web-app/app/components/barcode-scanner.tsx`

---

#### Task 1.2.3: Connect Barcode Scanner to Couchbase
**Description**: Make barcode scanner query real product data instead of showing mock results.

**Acceptance Criteria**:
- Valid article number queries Couchbase: `getProductByArticleNumber(articleNumber)`
- Query happens when user presses Enter or taps Scan button
- Shows product detail drawer if found
- Shows "Product not found" error if article number doesn't exist in database
- Loading spinner displayed during query
- Recent scans list updates with new scan

**Complexity**: M
**Dependencies**: Task 1.1.5, Task 1.2.2
**Files to Modify**:
- `/services/react-web-app/app/components/barcode-scanner.tsx`

---

#### Task 1.2.4: Implement Product Detail Display
**Description**: Ensure product detail drawer shows all relevant information from Couchbase document.

**Acceptance Criteria**:
- Displays: name, description, article number, category
- Shows warehouse location: Aisle (large number), Bay (large number), Section (large letter)
- Displays stock quantity with visual badge: Out of Stock (red), Critical Low (yellow), Low (yellow), In Stock (green)
- Shows last stock check timestamp in relative format ("5m ago", "2h ago")
- Displays price with currency
- Shows product image if `imageUrl` exists, placeholder otherwise
- Location typography: 40px+ font size for aisle/bay/section for visibility from 3 feet away
- Stock badge color-coded (red < 5, yellow 5-19, green 20+)

**Complexity**: M
**Dependencies**: Task 1.2.1
**Files to Modify**:
- `/services/react-web-app/app/components/product-card.tsx`
- `/services/react-web-app/app/components/product-detail-drawer.tsx`

---

### Epic 1.3: Offline Resilience

**Goal**: Ensure full app functionality when network is unavailable, with automatic sync when reconnected.

#### Task 1.3.1: Implement Offline Detection
**Description**: Build reliable online/offline detection and display sync status in header.

**Acceptance Criteria**:
- Uses `navigator.onLine` API to detect initial state
- Listens to `online` and `offline` events
- Pings Edge Server every 10 seconds to verify actual connectivity (navigator.onLine can be inaccurate)
- Header shows badge: "Online" (green), "Offline" (yellow), "Syncing..." (blue spinner)
- Toast notification on state change: "You're offline" / "You're back online"
- Auto-dismiss toast after 3 seconds

**Complexity**: M
**Dependencies**: Task 1.1.3
**Files to Modify**:
- `/services/react-web-app/app/lib/couchbase/hooks/useSyncStatus.ts`
- `/services/react-web-app/app/components/sync-status.tsx`

---

#### Task 1.3.2: Create Offline Change Queue
**Description**: Implement a queue to store product updates when offline, syncing when connection restored.

**Acceptance Criteria**:
- Uses IndexedDB to persist queue across browser sessions
- Queues all stock updates when offline
- Each queue entry includes: `productId`, `updates`, `timestamp`, `retryCount`
- Processes queue automatically when connection restored
- Retries failed syncs 3 times with exponential backoff (1s, 2s, 4s)
- Removes successfully synced items from queue
- Shows pending changes count in header: "3 pending changes"
- Visual indicator (yellow badge) on products with pending updates

**Complexity**: L
**Dependencies**: Task 1.3.1
**New Files**:
- `/services/react-web-app/app/lib/offline-queue.ts`

---

#### Task 1.3.3: Implement Optimistic UI Updates
**Description**: Update UI immediately when user changes stock, sync in background.

**Acceptance Criteria**:
- Stock +/- buttons update displayed quantity instantly
- Local state updated before API call
- If API call succeeds: keep updated state
- If API call fails: revert to previous state, show error toast
- Error toast shows "Failed to update stock" with Retry button
- Retry button re-attempts the update
- Works identically online and offline (offline updates queued)

**Complexity**: M
**Dependencies**: Task 1.3.2
**Files to Modify**:
- `/services/react-web-app/app/hooks/use-update-stock.ts`
- `/services/react-web-app/app/components/product-detail-drawer.tsx`

---

#### Task 1.3.4: Add Manual Sync Trigger
**Description**: Allow users to manually force sync when they suspect data is stale.

**Acceptance Criteria**:
- Sync button (refresh icon) in header, next to sync status badge
- Tapping button triggers immediate sync attempt
- Button shows spinner while syncing
- Button disabled during sync (prevent double-sync)
- Success toast: "Synced successfully"
- Error toast: "Sync failed" with details
- Also implement pull-to-refresh gesture on mobile (swipe down)

**Complexity**: S
**Dependencies**: Task 1.3.1, Task 1.3.2
**Files to Modify**:
- `/services/react-web-app/app/components/sync-status.tsx`
- `/services/react-web-app/app/routes/_index/route.tsx`

---

#### Task 1.3.5: Implement Stale Data Warning
**Description**: Warn users when local data hasn't synced recently, indicating potential staleness.

**Acceptance Criteria**:
- Tracks last successful sync timestamp
- Shows orange clock icon in header if last sync > 10 minutes ago
- Tooltip: "Last synced 12 minutes ago. Data may be outdated."
- Attempts auto-sync every 60 seconds when stale
- Warning clears after successful sync
- Does not block user from working (informational only)

**Complexity**: S
**Dependencies**: Task 1.3.1
**Files to Modify**:
- `/services/react-web-app/app/lib/couchbase/hooks/useSyncStatus.ts`
- `/services/react-web-app/app/components/sync-status.tsx`

---

### Epic 1.4: Stock Management

**Goal**: Enable staff to update stock levels quickly and reliably, with changes persisted to Couchbase.

#### Task 1.4.1: Implement Stock Update Persistence
**Description**: Connect stock +/- buttons to Couchbase Edge Server to persist changes.

**Acceptance Criteria**:
- Tapping + increments stock by 1, calls `updateStockLevel(productId, newStock)`
- Tapping - decrements stock by 1, minimum 0 (cannot go negative)
- Update includes: new stock value, `lastStockCheck` timestamp (ISO 8601)
- Update preserves `_rev` for conflict detection
- Works offline (queued in offline queue)
- Success shows brief success indicator (checkmark animation, 1 second)
- Failure shows error toast with Retry button

**Complexity**: M
**Dependencies**: Task 1.1.5, Task 1.3.2, Task 1.3.3
**Files to Modify**:
- `/services/react-web-app/app/hooks/use-update-stock.ts`
- `/services/react-web-app/app/lib/couchbase/client.ts`

---

#### Task 1.4.2: Add Stock Adjustment UI Improvements
**Description**: Improve usability of stock adjustment buttons for mobile touch.

**Acceptance Criteria**:
- Touch targets: 44x44px minimum for +/- buttons
- Buttons disabled while update in progress (prevent double-tap)
- Visual feedback on tap (button depression animation)
- Stock quantity updates instantly (optimistic UI)
- Large, readable stock number: 40px+ font size
- Color-coded stock badge updates in real-time (red/yellow/green)
- Spacing between buttons: 8px minimum

**Complexity**: S
**Dependencies**: Task 1.4.1
**Files to Modify**:
- `/services/react-web-app/app/components/product-detail-drawer.tsx`

---

#### Task 1.4.3: Implement Recent Scans Persistence
**Description**: Store scan history in Couchbase as `ScanEvent` documents instead of localStorage.

**Acceptance Criteria**:
- Each scan creates document with ID format: `scan:timestamp-uuid`
- Document includes: `type: "scan"`, `productId`, `articleNumber`, `userId`, `timestamp`, `deviceId`
- Scan history drawer shows last 5 scans (query by type and timestamp)
- Tapping recent scan re-searches that product
- Scan timestamps displayed in relative format ("2m ago", "1h ago")
- Scans sync to backend when online
- Keep fallback to localStorage if Couchbase unavailable

**Complexity**: M
**Dependencies**: Task 1.1.5
**Files to Modify**:
- `/services/react-web-app/app/components/barcode-scanner.tsx`
- `/services/react-web-app/app/lib/couchbase/client.ts` (add `createScanEvent` function)

---

---

## Phase 2: Enhanced Features

### Epic 2.1: Authentication & Security

**Goal**: Secure the application with user authentication and role-based access control.

#### Task 2.1.1: Design User Authentication Schema
**Description**: Define Pydantic model and TypeScript types for user accounts and sessions.

**Acceptance Criteria**:
- User document schema: `user:employeeId` with fields `employeeId`, `name`, `role`, `pinHash`, `createdAt`
- Session document schema: `session:token` with fields `userId`, `token`, `expiresAt`, `deviceId`
- Roles defined: `floor` (read-only), `warehouse` (stock updates), `manager` (reports), `admin` (all)
- Password policy: 8+ characters, alphanumeric + special (enforced in Pydantic validator)

**Complexity**: S
**Dependencies**: None
**New Files**:
- `/models/python/models/entities/user.py`
- `/services/react-web-app/app/types/user.ts`

---

#### Task 2.1.2: Implement PIN-Based Login
**Description**: Create login screen with employee ID + PIN authentication.

**Acceptance Criteria**:
- Login form: Employee ID (text input) + PIN (numeric input, masked)
- PIN hashed with bcrypt before comparison (never stored plaintext)
- Successful login creates session token (JWT or UUID)
- Session stored in localStorage and sent with all API requests
- Session expires after 4 hours of inactivity
- Failed login shows error: "Invalid credentials"
- Biometric option (Touch ID/Face ID) for supported devices (stretch goal)

**Complexity**: L
**Dependencies**: Task 2.1.1
**New Files**:
- `/services/react-web-app/app/routes/login/route.tsx`
- `/services/react-web-app/app/lib/auth/auth-context.tsx`

---

#### Task 2.1.3: Implement Role-Based Access Control
**Description**: Restrict features based on user role.

**Acceptance Criteria**:
- Floor role: Can search, scan, view products (read-only, no stock updates)
- Warehouse role: All floor permissions + stock updates
- Manager role: All warehouse permissions + view reports (Phase 2.3)
- Admin role: All permissions + user management
- UI hides stock +/- buttons for floor role
- API returns 403 Forbidden if role insufficient for operation
- Audit log records all stock changes with userId

**Complexity**: M
**Dependencies**: Task 2.1.2
**Files to Modify**:
- `/services/react-web-app/app/components/product-detail-drawer.tsx`
- `/services/react-web-app/app/lib/auth/auth-context.tsx`
- Backend: Add middleware for role checking

---

#### Task 2.1.4: Add Session Timeout and Auto-Logout
**Description**: Automatically log users out after inactivity period.

**Acceptance Criteria**:
- Session expires after 4 hours of inactivity
- Activity tracked: any user interaction (tap, scroll, type)
- 5-minute warning before timeout: "You will be logged out in 5 minutes due to inactivity"
- Warning shows Extend Session button
- Auto-logout redirects to login screen
- Session token removed from localStorage on logout

**Complexity**: M
**Dependencies**: Task 2.1.2
**Files to Modify**:
- `/services/react-web-app/app/lib/auth/auth-context.tsx`

---

#### Task 2.1.5: Implement Audit Logging
**Description**: Log all stock changes and user actions for compliance and debugging.

**Acceptance Criteria**:
- Audit log document schema: `audit:timestamp-uuid` with fields `userId`, `action`, `resourceId`, `timestamp`, `details`
- Logs created for: stock updates, user login/logout, product scans
- Logs include: who (userId), what (action type), when (timestamp), where (deviceId)
- Logs synced to backend (never deleted from device)
- Manager role can view audit logs (Phase 2.3)
- Logs retained for 24 months

**Complexity**: M
**Dependencies**: Task 2.1.2
**New Files**:
- `/models/python/models/entities/audit.py`
- `/services/react-web-app/app/lib/couchbase/client.ts` (add `createAuditLog` function)

---

### Epic 2.2: Advanced Stock Management

**Goal**: Improve stock management workflows with bulk operations and history tracking.

#### Task 2.2.1: Implement Bulk Stock Update Mode
**Description**: Allow staff to scan and update multiple products in sequence without closing detail view.

**Acceptance Criteria**:
- Toggle "Bulk Mode" button in scanner interface
- In bulk mode: after updating stock, scanner resets for next scan (detail drawer stays open)
- Shows count: "3 products updated in this session"
- Exit bulk mode button to return to normal operation
- All bulk updates still queued and synced normally

**Complexity**: M
**Dependencies**: Task 1.4.1
**Files to Modify**:
- `/services/react-web-app/app/components/barcode-scanner.tsx`
- `/services/react-web-app/app/components/product-detail-drawer.tsx`

---

#### Task 2.2.2: Add Stock Adjustment Reason Field
**Description**: Allow staff to specify why stock was adjusted.

**Acceptance Criteria**:
- Dropdown with options: "Recount", "Damage", "Theft", "Sale", "Receiving", "Other"
- Optional text field for additional notes
- Saved in stock update document: `adjustmentReason`, `adjustmentNotes`
- Shows in stock history view (Task 2.2.3)
- Defaults to "Recount" if not specified

**Complexity**: S
**Dependencies**: Task 1.4.1
**Files to Modify**:
- `/services/react-web-app/app/components/product-detail-drawer.tsx`
- Product schema (add optional fields)

---

#### Task 2.2.3: Build Stock History View
**Description**: Show last 10 stock adjustments for a product with timestamps and reasons.

**Acceptance Criteria**:
- "Stock History" tab in product detail drawer
- Lists last 10 adjustments: date/time, old value, new value, reason, user (if auth enabled)
- Sorted by timestamp (newest first)
- Relative timestamps: "2m ago", "1h ago", "Yesterday at 3:45 PM"
- Shows "No history available" if no adjustments
- History synced from backend (not local-only)

**Complexity**: M
**Dependencies**: Task 2.2.2, Task 2.1.2
**New Files**:
- `/services/react-web-app/app/components/stock-history.tsx`

---

#### Task 2.2.4: Implement Low Stock Notifications
**Description**: Alert staff when products fall below reorder threshold.

**Acceptance Criteria**:
- Product schema includes: `reorderThreshold` (default: 5)
- Low stock badge shown on product card if `stock < reorderThreshold`
- Low stock filter in search: "Show only low stock items"
- Count of low stock items in header badge: "12 low stock"
- Push notifications for critical stock (stretch goal, requires notification service)

**Complexity**: M
**Dependencies**: Task 1.2.4
**Files to Modify**:
- Product schema (add `reorderThreshold` field)
- `/services/react-web-app/app/components/product-card.tsx`
- `/services/react-web-app/app/routes/_index/route.tsx`

---

#### Task 2.2.5: Add Export Stock Report to CSV
**Description**: Allow managers to export current stock levels for offline analysis.

**Acceptance Criteria**:
- "Export to CSV" button in manager view
- CSV includes columns: Article Number, Name, Category, Stock, Last Check, Location (Aisle-Bay-Section), Status
- File name: `ikea-stock-report-YYYY-MM-DD.csv`
- Downloads to device
- Only available to manager/admin roles
- Shows export progress for large datasets

**Complexity**: M
**Dependencies**: Task 2.1.3
**New Files**:
- `/services/react-web-app/app/lib/export-csv.ts`

---

### Epic 2.3: Analytics & History

**Goal**: Provide insights into product scan patterns and inventory trends.

#### Task 2.3.1: Build Scan History View
**Description**: Show staff their personal scan history with filtering.

**Acceptance Criteria**:
- New route: `/history`
- Shows last 50 scans for logged-in user
- Filter by: date range, product category, location (aisle)
- Sort by: timestamp (newest/oldest), product name
- Each entry shows: product name, article number, timestamp, location
- Tap entry to view product detail
- Search within history by product name

**Complexity**: M
**Dependencies**: Task 1.4.3, Task 2.1.2
**New Files**:
- `/services/react-web-app/app/routes/history/route.tsx`

---

#### Task 2.3.2: Create Manager Dashboard
**Description**: Build analytics dashboard for managers to monitor inventory and staff activity.

**Acceptance Criteria**:
- New route: `/dashboard` (manager/admin role only)
- Widgets: Total products, Low stock count, Out of stock count, Scans today
- Charts: Stock levels by category (bar chart), Scan frequency over time (line chart)
- Top 10 most scanned products (table)
- Filter by date range: Today, This Week, This Month
- Refresh button to update data
- Responsive layout (cards on mobile, grid on desktop)

**Complexity**: L
**Dependencies**: Task 2.1.3
**New Files**:
- `/services/react-web-app/app/routes/dashboard/route.tsx`
- `/services/react-web-app/app/components/charts/bar-chart.tsx`
- `/services/react-web-app/app/components/charts/line-chart.tsx`

---

#### Task 2.3.3: Implement Product Scan Heatmap
**Description**: Visualize which products are scanned most frequently.

**Acceptance Criteria**:
- Heatmap view in dashboard showing product scan frequency
- Color gradient: white (never scanned) → yellow (moderate) → red (high frequency)
- Shows product name and scan count on hover
- Filter by date range
- Identifies products needing attention (never scanned = potentially misplaced/forgotten)
- Sortable by scan count

**Complexity**: M
**Dependencies**: Task 2.3.2
**Files to Modify**:
- `/services/react-web-app/app/routes/dashboard/route.tsx`

---

---

## Phase 3: Future Enhancements

### Epic 3.1: BLE Indoor Positioning

**Goal**: Use Bluetooth beacons to track staff position and verify scan locations.

#### Task 3.1.1: Research BLE Beacon Infrastructure
**Description**: Investigate BLE beacon options and deployment requirements.

**Acceptance Criteria**:
- Research report comparing: Estimote, Kontakt.io, Aruba, Cisco DNA Spaces
- Cost analysis per beacon and store coverage requirements
- Battery life and maintenance considerations
- Integration options with web browser (Web Bluetooth API)
- Accuracy expectations (target: ±2 meters)
- Deployment plan for pilot store

**Complexity**: M
**Dependencies**: None
**Deliverable**: Research report document

---

#### Task 3.1.2: Implement BLE Position Detection
**Description**: Use Web Bluetooth API to triangulate staff position from beacon signals.

**Acceptance Criteria**:
- Requests Bluetooth permission on first use
- Scans for nearby beacons every 5 seconds
- Calculates position using trilateration (3+ beacons)
- Updates user position in real-time
- Position accuracy: ±2 meters
- Shows user position on warehouse map (Task 3.1.3)
- Fallback to manual location entry if BLE unavailable

**Complexity**: XL
**Dependencies**: Task 3.1.1
**New Files**:
- `/services/react-web-app/app/lib/ble/position.ts`

---

#### Task 3.1.3: Add Location Verification on Scan
**Description**: Compare scanned product's expected location with staff's BLE position.

**Acceptance Criteria**:
- When user scans product, check if staff position matches product location (within 10 meters)
- Green checkmark if match: "Location verified"
- Yellow warning if mismatch: "You scanned this product 15m from its expected location. Is it misplaced?"
- Allow staff to confirm location is correct or flag as misplaced
- Misplaced products create alert for warehouse team
- Logs location verification results in scan event

**Complexity**: M
**Dependencies**: Task 3.1.2
**Files to Modify**:
- `/services/react-web-app/app/components/barcode-scanner.tsx`

---

#### Task 3.1.4: Create Staff Movement Heatmap
**Description**: Visualize staff movement patterns for store layout optimization.

**Acceptance Criteria**:
- Manager dashboard widget showing staff position heatmap
- Color gradient: white (rarely visited) → blue → red (frequently visited)
- Time range filter: Today, This Week, This Month
- Identifies dead zones (areas staff never visit)
- Identifies high-traffic areas
- Helps optimize product placement and staff routing

**Complexity**: L
**Dependencies**: Task 3.1.2, Task 2.3.2
**Files to Modify**:
- `/services/react-web-app/app/routes/dashboard/route.tsx`

---

### Epic 3.2: AR Navigation

**Goal**: Use augmented reality to guide staff to product locations.

#### Task 3.2.1: Implement AR Camera Overlay
**Description**: Build AR view using device camera and ARKit/ARCore.

**Acceptance Criteria**:
- AR mode button in product detail drawer
- Activates device camera with AR overlay
- Shows directional arrows and distance to product
- Turn-by-turn navigation from current position (requires BLE)
- Visual markers at aisle/bay intersections
- Works on iOS (ARKit) and Android (ARCore)
- Graceful fallback to 2D map if AR not supported

**Complexity**: XL
**Dependencies**: Task 3.1.2
**New Files**:
- `/services/react-web-app/app/components/ar-navigation.tsx`
- `/services/react-web-app/app/lib/ar/ar-engine.ts`

---

#### Task 3.2.2: Build 2D Warehouse Map Fallback
**Description**: Create interactive 2D map for devices without AR capability.

**Acceptance Criteria**:
- SVG-based warehouse floor plan
- Shows aisles, bays, sections clearly labeled
- Highlights product location with pulsing marker
- Shows user position (blue dot) if BLE available
- Pan and zoom gestures
- Tap aisle to zoom in for detail
- "Navigate to Location" button replaced with "Show on Map"

**Complexity**: L
**Dependencies**: None
**New Files**:
- `/services/react-web-app/app/components/warehouse-map.tsx`

---

### Epic 3.3: Edge AI Features

**Goal**: Use on-device machine learning for smart recommendations and search.

#### Task 3.3.1: Implement Smart Search with Typo Correction
**Description**: Use ML model to handle typos and suggest corrections.

**Acceptance Criteria**:
- Detects typos and suggests corrections: "BILY" → "Did you mean BILLY?"
- Synonym matching: "shelf" matches "bookcase"
- Swedish-English translation: "hylla" matches "shelf"
- Fast on-device inference (< 50ms)
- Falls back to exact match if model unavailable
- Uses TensorFlow.js or similar lightweight model

**Complexity**: L
**Dependencies**: None
**New Files**:
- `/services/react-web-app/app/lib/ml/search-model.ts`

---

#### Task 3.3.2: Add Product Recommendation Engine
**Description**: Suggest related products based on scan history.

**Acceptance Criteria**:
- "Frequently bought together" widget in product detail
- Shows 3 related products based on historical scan patterns
- Updates recommendations daily based on new scan data
- On-device ML model (collaborative filtering)
- Falls back to category-based suggestions if insufficient data
- Helps staff suggest complementary items to customers

**Complexity**: L
**Dependencies**: Task 1.4.3
**New Files**:
- `/services/react-web-app/app/lib/ml/recommendation-model.ts`
- `/services/react-web-app/app/components/product-recommendations.tsx`

---

#### Task 3.3.3: Implement Predictive Stock Alerts
**Description**: Use ML to predict stockouts before they happen.

**Acceptance Criteria**:
- Analyzes historical stock levels and scan patterns
- Predicts when product will reach 0 stock (e.g., "Out of stock in 3 days")
- Alerts shown in manager dashboard
- Considers seasonality and trends
- Model retrains weekly with new data
- Accuracy target: > 80% within ±2 days

**Complexity**: XL
**Dependencies**: Task 2.3.2
**New Files**:
- `/services/react-web-app/app/lib/ml/stock-prediction-model.ts`

---

#### Task 3.3.4: Build Image-Based Product Search
**Description**: Allow staff to snap photo of product to identify it.

**Acceptance Criteria**:
- Camera button in search interface
- Takes photo of product
- Runs on-device image recognition model
- Returns top 5 product matches
- Shows confidence score for each match
- Falls back to barcode scan if no match found
- Model trained on IKEA product images

**Complexity**: XL
**Dependencies**: None
**New Files**:
- `/services/react-web-app/app/lib/ml/image-recognition-model.ts`
- `/services/react-web-app/app/components/image-search.tsx`

---

#### Task 3.3.5: Add Voice Search
**Description**: Enable hands-free product search using voice input.

**Acceptance Criteria**:
- Microphone button in search bar
- Uses Web Speech API (browser native)
- Converts speech to text in real-time
- Shows transcription as user speaks
- Automatically searches when user stops speaking
- Supports Swedish and English
- Fallback to typed search if speech API unavailable

**Complexity**: M
**Dependencies**: Task 1.2.1
**Files to Modify**:
- `/services/react-web-app/app/components/product-search.tsx`

---

---

## Technical Debt & Cleanup

### Task TD-1: Add React Error Boundaries
**Description**: Implement error boundaries to catch runtime errors and prevent full app crashes.

**Acceptance Criteria**:
- Error boundary component wraps entire app
- Catches and logs all unhandled React errors
- Shows user-friendly error screen: "Something went wrong"
- Provides "Reload App" button
- Logs error details to console and error tracking service
- Doesn't crash app on component errors

**Complexity**: S
**Dependencies**: None
**New Files**:
- `/services/react-web-app/app/components/error-boundary.tsx`

---

### Task TD-2: Remove Hardcoded Configuration
**Description**: Externalize all configuration to environment variables.

**Acceptance Criteria**:
- Edge Server URL from env var: `VITE_EDGE_SERVER_URL`
- Sync interval from env var: `VITE_SYNC_INTERVAL_MS`
- Default to localhost:59840 if env var not set
- Validation: warn if Edge Server URL unreachable on app start
- Document all env vars in `.env.example`

**Complexity**: S
**Dependencies**: None
**Files to Modify**:
- `/services/react-web-app/app/lib/couchbase/client.ts`
- Create: `/services/react-web-app/.env.example`

---

### Task TD-3: Implement Couchbase Conflict Resolution
**Description**: Handle sync conflicts gracefully instead of failing silently.

**Acceptance Criteria**:
- Detect conflicts by comparing `_rev` values
- Default strategy: last-write-wins (revision with higher generation number)
- Log conflicts to console with details: document ID, conflicting revisions
- Create `conflict` document type to record conflicts for audit
- Manager dashboard shows conflict count (Phase 2)
- No user-facing errors on conflicts (automatic resolution)

**Complexity**: M
**Dependencies**: Task 1.3.2
**Files to Modify**:
- `/services/react-web-app/app/lib/couchbase/client.ts`

---

### Task TD-4: Add Pagination for Product List
**Description**: Prevent performance issues when displaying 1000+ products.

**Acceptance Criteria**:
- Load 50 products initially
- "Load More" button at bottom of list (loads next 50)
- Infinite scroll option (loads on scroll to bottom)
- Shows loading spinner while fetching next page
- Preserves search filters when loading more
- Reset to page 1 when search query changes

**Complexity**: M
**Dependencies**: Task 1.2.1
**Files to Modify**:
- `/services/react-web-app/app/lib/couchbase/hooks/useProducts.ts`
- `/services/react-web-app/app/routes/_index/route.tsx`

---

### Task TD-5: Improve TypeScript Strict Mode Compliance
**Description**: Enable TypeScript strict mode and fix all type errors.

**Acceptance Criteria**:
- `tsconfig.json` has `"strict": true`
- Zero TypeScript errors in build
- All function parameters typed (no implicit `any`)
- All return types explicitly declared
- Null checks for optional values
- Type guards for union types

**Complexity**: M
**Dependencies**: None
**Files to Modify**:
- All `.ts` and `.tsx` files
- `/services/react-web-app/tsconfig.json`

---

### Task TD-6: Add ESLint and Prettier Configuration
**Description**: Enforce consistent code style across the project.

**Acceptance Criteria**:
- ESLint configured with React, TypeScript, and a11y rules
- Prettier configured with 2-space indents, single quotes, trailing commas
- Pre-commit hook runs linting and formatting
- CI/CD fails on linting errors
- All existing code passes linting (or fix violations)

**Complexity**: S
**Dependencies**: None
**New Files**:
- `/services/react-web-app/.eslintrc.json`
- `/services/react-web-app/.prettierrc.json`
- `/services/react-web-app/.husky/pre-commit`

---

### Task TD-7: Optimize Bundle Size
**Description**: Reduce initial bundle size for faster load times.

**Acceptance Criteria**:
- Code splitting for routes (lazy loading)
- Tree-shaking unused dependencies
- Bundle analyzer report shows < 5MB total size
- Lazy load shadcn/ui components
- Compress images and assets
- Production build minified and gzipped

**Complexity**: M
**Dependencies**: None
**Files to Modify**:
- `/services/react-web-app/vite.config.ts`
- `/services/react-web-app/app/routes/*` (add lazy loading)

---

---

## Testing Tasks

### Task TEST-1: Set Up Unit Test Framework
**Description**: Configure Vitest and React Testing Library for unit testing.

**Acceptance Criteria**:
- Vitest installed and configured
- React Testing Library + testing utilities installed
- Test script in package.json: `npm test`
- Example test for utility function passes
- Coverage report generated: `npm run test:coverage`
- Target: > 80% coverage

**Complexity**: S
**Dependencies**: None
**New Files**:
- `/services/react-web-app/vitest.config.ts`
- `/services/react-web-app/app/lib/__tests__/example.test.ts`

---

### Task TEST-2: Write Unit Tests for Core Functions
**Description**: Test all utility functions and business logic.

**Acceptance Criteria**:
- Tests for: `validateArticleNumber`, `formatTimestamp`, `calculateStockStatus`, `searchProducts`
- Happy path tests (valid inputs)
- Edge case tests (empty arrays, null values, boundary conditions)
- Error case tests (invalid inputs throw expected errors)
- All tests pass
- Coverage: 100% for utility functions

**Complexity**: M
**Dependencies**: Task TEST-1
**New Files**:
- `/services/react-web-app/app/lib/__tests__/validation.test.ts`
- `/services/react-web-app/app/lib/__tests__/formatting.test.ts`

---

### Task TEST-3: Write Integration Tests for Couchbase Sync
**Description**: Test product CRUD operations against real Couchbase Edge Server.

**Acceptance Criteria**:
- Docker Compose spins up test Edge Server instance
- Test database isolated (namespace: `test:`)
- Tests create/read/update/delete products
- Tests verify sync conflict resolution
- Tests verify offline queue behavior
- Tests reset database between runs
- All tests pass

**Complexity**: L
**Dependencies**: Task 1.1.5, Task TEST-1
**New Files**:
- `/services/react-web-app/app/lib/couchbase/__tests__/integration.test.ts`
- `/services/react-web-app/docker-compose.test.yml`

---

### Task TEST-4: Write E2E Tests for Critical Flows
**Description**: Test complete user journeys from UI to database.

**Acceptance Criteria**:
- Playwright configured and installed
- Test scenarios:
  1. Search for product → View details
  2. Scan barcode → View details
  3. Update stock → Verify persistence
  4. Offline mode → Queue changes → Sync when online
  5. Error handling → Invalid barcode
- Tests run in CI/CD
- Screenshots captured on test failure

**Complexity**: L
**Dependencies**: Task 1.2.1, Task 1.3.2, Task 1.4.1
**New Files**:
- `/services/react-web-app/e2e/search.spec.ts`
- `/services/react-web-app/e2e/scan.spec.ts`
- `/services/react-web-app/e2e/offline.spec.ts`
- `/services/react-web-app/playwright.config.ts`

---

### Task TEST-5: Test Offline Scenarios
**Description**: Verify app behavior in various offline conditions.

**Acceptance Criteria**:
- Test: App loads offline from cache
- Test: Search works offline
- Test: Stock update queued offline
- Test: Auto-sync on reconnection
- Test: Multiple offline changes sync correctly
- Test: Sync conflict resolution works
- Test: Network interruption during sync resumes gracefully
- All tests pass

**Complexity**: M
**Dependencies**: Task TEST-4, Task 1.3.2
**Files to Modify**:
- `/services/react-web-app/e2e/offline.spec.ts`

---

### Task TEST-6: Performance Benchmarking
**Description**: Measure and validate performance against NFR requirements.

**Acceptance Criteria**:
- Benchmark: Product query response time (target: < 100ms p95)
- Benchmark: Search with debounce (target: < 300ms total)
- Benchmark: App cold start (target: < 2s to interactive)
- Benchmark: Sync 100 changes (target: < 5s)
- Lighthouse PWA audit (target: > 90 score)
- Performance CI check fails if targets not met

**Complexity**: M
**Dependencies**: Task 1.2.1, Task 1.3.2
**New Files**:
- `/services/react-web-app/benchmarks/performance.ts`

---

---

## Documentation Tasks

### Task DOC-1: Write Developer Setup Guide
**Description**: Create comprehensive guide for new developers to get started.

**Acceptance Criteria**:
- Prerequisites: Node.js version, Python version, Docker
- Clone repository instructions
- Install dependencies: `npm install`, `pip install`
- Seed database: `python scripts/seed-database.py`
- Run app: `npm run dev`
- Common troubleshooting section
- Links to related docs (ANALYSIS.md, TASK_BREAKDOWN.md)

**Complexity**: S
**Dependencies**: Task 1.1.2
**New Files**:
- `/README.md` (or update existing)

---

### Task DOC-2: Create API Documentation
**Description**: Document all Couchbase client functions and data schemas.

**Acceptance Criteria**:
- JSDoc comments on all public functions
- Parameter types, return types, examples
- Document schema for: Product, ScanEvent, User, Session, AuditLog
- Field descriptions, validation rules, examples
- Generate HTML docs from JSDoc (optional)

**Complexity**: M
**Dependencies**: Task 1.1.5
**Files to Modify**:
- Add JSDoc to: `/services/react-web-app/app/lib/couchbase/client.ts`
- Add schema docs to: `/docs/API.md`

---

### Task DOC-3: Write User Guide for Staff
**Description**: Create simple guide for store staff using the app.

**Acceptance Criteria**:
- How to search for products (with screenshots)
- How to scan barcodes (manual and camera)
- How to update stock levels
- How to interpret stock badges (red/yellow/green)
- Troubleshooting: "What if product not found?", "What if app is offline?"
- Printable quick reference card (1-page PDF)

**Complexity**: S
**Dependencies**: Phase 1 MVP complete
**New Files**:
- `/docs/USER_GUIDE.md`
- `/docs/QUICK_REFERENCE.pdf`

---

### Task DOC-4: Create Deployment Runbook
**Description**: Document deployment process for production.

**Acceptance Criteria**:
- Pre-deployment checklist (tests pass, env vars set, database backed up)
- Deployment steps for React app (build, deploy to hosting)
- Deployment steps for Edge Server (Docker Compose, configuration)
- Rollback procedure if deployment fails
- Post-deployment verification (health checks, smoke tests)
- Monitoring and alerting setup

**Complexity**: M
**Dependencies**: None
**New Files**:
- `/docs/DEPLOYMENT.md`

---

### Task DOC-5: Write Architecture Decision Records (ADRs)
**Description**: Document key architectural decisions and rationales.

**Acceptance Criteria**:
- ADR-001: Why Couchbase Edge Server for offline-first
- ADR-002: Why React + shadcn/ui for frontend
- ADR-003: Schema design decisions (Product, ScanEvent)
- ADR-004: Conflict resolution strategy (last-write-wins)
- ADR-005: Authentication approach (PIN vs SSO)
- Format: Title, Status, Context, Decision, Consequences

**Complexity**: S
**Dependencies**: None
**New Files**:
- `/docs/adr/001-offline-first-architecture.md`
- `/docs/adr/002-frontend-tech-stack.md`
- etc.

---

---

## Summary by Phase

### Phase 1: MVP (15 tasks, ~12-16 days)
**Goal**: Working demo with offline-first product search, barcode scanning, and stock updates.

**Epic 1.1**: 5 tasks (Data Layer Foundation)
**Epic 1.2**: 4 tasks (Core Search & Display)
**Epic 1.3**: 5 tasks (Offline Resilience)
**Epic 1.4**: 3 tasks (Stock Management)

**Critical Path**: Task 1.1.1 → 1.1.2 → 1.1.5 → 1.2.1 → 1.3.1 → 1.3.2 → 1.4.1

---

### Phase 2: Enhanced Features (15 tasks, ~15-20 days)
**Goal**: Secure, feature-rich app with authentication, advanced stock management, and analytics.

**Epic 2.1**: 5 tasks (Authentication & Security)
**Epic 2.2**: 5 tasks (Advanced Stock Management)
**Epic 2.3**: 3 tasks (Analytics & History)

**Dependencies**: Requires Phase 1 MVP complete

---

### Phase 3: Future Enhancements (13 tasks, ~30-40 days)
**Goal**: Cutting-edge features for competitive differentiation.

**Epic 3.1**: 4 tasks (BLE Positioning)
**Epic 3.2**: 2 tasks (AR Navigation)
**Epic 3.3**: 5 tasks (Edge AI Features)

**Dependencies**: Requires infrastructure (BLE beacons, AR hardware support)

---

### Technical Debt & Cleanup (7 tasks, ~5-7 days)
Can be done in parallel with feature development.

---

### Testing Tasks (6 tasks, ~8-10 days)
Can be done incrementally as features are built.

---

### Documentation Tasks (5 tasks, ~3-5 days)
Can be done in parallel with development.

---

## Recommended Sprint Plan (2-week sprints)

**Sprint 1 (MVP Foundation)**
- Epic 1.1: Data Layer Foundation (all tasks)
- Task TD-2: Remove Hardcoded Configuration

**Sprint 2 (MVP Core Features)**
- Epic 1.2: Core Search & Display (all tasks)
- Task TEST-1: Set Up Unit Test Framework
- Task TEST-2: Write Unit Tests for Core Functions

**Sprint 3 (MVP Offline & Stock)**
- Epic 1.3: Offline Resilience (all tasks)
- Epic 1.4: Stock Management (all tasks)
- Task TD-1: Add React Error Boundaries

**Sprint 4 (MVP Hardening)**
- Task TD-3: Implement Couchbase Conflict Resolution
- Task TEST-3: Write Integration Tests for Couchbase Sync
- Task TEST-4: Write E2E Tests for Critical Flows
- Task DOC-1: Write Developer Setup Guide
- **MVP LAUNCH**

**Sprint 5 (Phase 2: Authentication)**
- Epic 2.1: Authentication & Security (all tasks)

**Sprint 6 (Phase 2: Advanced Stock)**
- Epic 2.2: Advanced Stock Management (all tasks)

**Sprint 7 (Phase 2: Analytics)**
- Epic 2.3: Analytics & History (all tasks)
- Task DOC-3: Write User Guide for Staff

**Sprint 8+ (Phase 3 & Beyond)**
- Select Phase 3 epics based on business priorities and resource availability

---

## Notes

- **Dependencies**: Always complete prerequisite tasks before starting dependent tasks
- **Parallel Work**: Tasks without dependencies can be worked on simultaneously by different team members
- **Flexibility**: This plan is a guide; adjust based on team capacity, feedback, and changing priorities
- **Testing**: Write tests as you build features (TDD), don't wait until the end
- **Documentation**: Update docs incrementally; don't leave for the end

**Next Steps**: Review with team, assign tasks to sprints, create tickets in project management tool (Jira, Linear, etc.)

---

**Last Updated**: 2026-03-03
**Document Owner**: Engineering Lead, IKEA Staff Product Finder

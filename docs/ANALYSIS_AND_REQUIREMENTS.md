# IKEA Staff Product Finder - Analysis & Requirements

**Version:** 1.0
**Date:** 2026-03-03
**Status:** Draft

## 1. Executive Summary

### 1.1 Project Vision

The IKEA Staff Product Finder is an offline-first mobile application designed to revolutionize how store staff locate and manage products in IKEA warehouses. By leveraging Couchbase Edge Server for local data caching, the application ensures uninterrupted access to product information regardless of network connectivity, dramatically reducing the time staff spend searching for items and improving customer service efficiency.

### 1.2 Key Value Proposition

- **Instant Access**: Sub-100ms response times for local product queries, even when offline
- **Reliability**: Full functionality during network outages or in areas with poor connectivity
- **Efficiency**: Staff can locate products via barcode scan or search, view exact warehouse locations, and update stock levels in real-time
- **Scalability**: Designed to handle 200+ products initially, with architecture supporting thousands

### 1.3 Target Users

**Primary Users (Phase 1)**
- Store floor workers who help customers locate products
- Warehouse staff conducting inventory checks
- Customer service representatives answering product availability queries

**Secondary Users (Phase 2)**
- Store managers monitoring inventory levels and stock patterns
- Stock replenishment teams planning reorders

**Future Users (Phase 3)**
- Customers using self-service product finder kiosks or mobile app
- Delivery personnel verifying product availability

### 1.4 Core Assumption

Products are scanned at their physical shelf location, enabling location verification and establishing a foundation for future BLE-based positioning and AR navigation features.

## 2. Current State Analysis

### 2.1 Implemented Features

**Frontend (React with React Router 7 + shadcn/ui)**
- ✅ Product search component with debounced input
- ✅ Barcode scanner interface (manual entry with format validation XXX.XXX.XX)
- ✅ Product card display in responsive grid layout
- ✅ Product detail drawer with comprehensive information
- ✅ Warehouse location visualization (Aisle, Bay, Section)
- ✅ Stock level display with visual status indicators
- ✅ Sync status header showing online/offline state
- ✅ Recent scans history (localStorage-based, last 5 scans)
- ✅ Stock adjustment UI (+/- buttons)
- ✅ Mobile-first responsive design
- ✅ Complete shadcn/ui component library integration

**Backend/Data Layer**
- ✅ Pydantic data models (Product, ProductLocation, ScanEvent)
- ✅ Couchbase Edge Server client with retry logic and timeout handling
- ✅ Document ID schema (product:XXX.XXX.XX, scan:timestamp-uuid)
- ✅ Client-side product filtering and search
- ✅ FastAPI service scaffold
- ✅ Sample dataset with 220 IKEA products

**Infrastructure**
- ✅ Polytope stack configuration (Couchbase Server, Sync Gateway, Edge Server)
- ✅ Service orchestration setup
- ✅ TypeScript and Python shared models

### 2.2 Placeholder/Mock Implementations

**Critical Gaps**
- ⚠️ **Mock data in React hooks**: `use-products.ts` uses hardcoded MOCK_PRODUCTS array instead of Couchbase client
- ⚠️ **No actual Couchbase integration**: Frontend hooks don't call the Couchbase Edge Server REST API
- ⚠️ **Stock updates not persisted**: `useUpdateStock` simulates API calls but doesn't write to Couchbase
- ⚠️ **Sync status simulation**: `useSyncStatus` uses mock intervals instead of real sync events
- ⚠️ **Camera scanning**: Button present but shows "coming soon" alert
- ⚠️ **Navigation feature**: "Navigate to Location" button is placeholder
- ⚠️ **No scan event persistence**: Scans not saved to Couchbase as ScanEvent documents
- ⚠️ **No offline queue**: Changes not queued when offline for later sync

**Data Schema Mismatches**
- Frontend Product type uses `location.aisle: string`, backend uses `aisle: int`
- Frontend uses `stock.quantity` nested object, backend sample data uses flat `stock: int`
- Frontend `imageUrl` vs backend sample data inconsistent field naming

### 2.3 Technical Debt

1. **Type Inconsistencies**: Frontend TypeScript types don't match Python Pydantic models
2. **Dual Hook Implementations**: Both `/app/hooks/use-products.ts` (mock) and `/app/lib/couchbase/hooks/useProducts.ts` (real client) exist, causing confusion
3. **No Data Loading Strategy**: No script to seed Couchbase Edge Server with the 220-product dataset
4. **Missing Error Boundaries**: No React error boundaries for graceful degradation
5. **No Test Coverage**: No unit, integration, or E2E tests
6. **Hardcoded Configuration**: Edge Server URL hardcoded (http://127.0.0.1:59840)
7. **No Conflict Resolution**: Couchbase conflict handling not implemented
8. **No Pagination**: All 220+ products loaded at once

### 2.4 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    React Web App (Port 5173)                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  UI Layer (shadcn/ui components)                      │   │
│  │  - BarcodeScanner, ProductSearch, ProductCard, etc.  │   │
│  └────────────────────┬─────────────────────────────────┘   │
│                       │                                      │
│  ┌────────────────────▼─────────────────────────────────┐   │
│  │  Hooks Layer (React hooks)                           │   │
│  │  - useProducts, useSyncStatus, useUpdateStock        │   │
│  └────────────────────┬─────────────────────────────────┘   │
│                       │                                      │
│  ┌────────────────────▼─────────────────────────────────┐   │
│  │  Couchbase Client (REST API client)                  │   │
│  │  - getAllDocuments, putDocument, searchProducts      │   │
│  │  - Retry logic, timeout handling, offline detection  │   │
│  └────────────────────┬─────────────────────────────────┘   │
└────────────────────────┼─────────────────────────────────────┘
                         │ HTTP REST API
                         │ (localhost:59840)
┌────────────────────────▼─────────────────────────────────────┐
│            Couchbase Edge Server (Lite)                      │
│  - Local database: ikea_products                             │
│  - Offline-first data storage                                │
│  - Automatic conflict resolution                             │
└────────────────────────┬─────────────────────────────────────┘
                         │ Sync Gateway Protocol
                         │ (when online)
┌────────────────────────▼─────────────────────────────────────┐
│                  Sync Gateway                                │
│  - Authentication & authorization                            │
│  - Data routing & replication                                │
└────────────────────────┬─────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────┐
│              Couchbase Server (Backend)                      │
│  - Central product database                                  │
│  - Multi-store data synchronization                          │
│  - Analytics & reporting data source                         │
└──────────────────────────────────────────────────────────────┘
```

**Data Flow**
1. User scans product or searches
2. React hook queries Couchbase Edge Server via REST API
3. Edge Server returns data from local database (offline-capable)
4. UI displays product with location/stock information
5. User updates stock → putDocument to Edge Server
6. Edge Server syncs changes to Sync Gateway when online
7. Sync Gateway propagates to Couchbase Server and other Edge instances

## 3. User Personas

### 3.1 Primary: Floor Worker (Emma)

**Profile**
- Name: Emma, 28
- Role: Sales Floor Associate
- Experience: 2 years at IKEA
- Tech comfort: Medium (uses smartphone daily, not tech-savvy)

**Goals**
- Help customers find products quickly (< 30 seconds)
- Check if products are in stock without walking to warehouse
- Provide accurate location information to reduce customer wait time

**Pain Points**
- Current paper-based shelf maps are outdated and hard to read
- Walking to warehouse to check stock wastes 5-10 minutes per customer
- No way to verify product location without physically checking
- Network dead zones in warehouse prevent phone-based lookup

**Usage Scenario**
Emma is helping a customer looking for a KALLAX shelf unit. She scans the product's barcode with her tablet. Within 1 second, she sees it's in Aisle 12, Bay 3, Section A with 23 units in stock. She directs the customer immediately, saving 8 minutes of search time.

### 3.2 Primary: Warehouse Staff (Marcus)

**Profile**
- Name: Marcus, 35
- Role: Warehouse Inventory Specialist
- Experience: 5 years at IKEA
- Tech comfort: High (uses inventory systems daily)

**Goals**
- Complete stock counts efficiently (100+ items per shift)
- Update stock levels accurately in real-time
- Identify low-stock items proactively
- Record scan history for audit trail

**Pain Points**
- Warehouse has poor WiFi coverage (30% dead zones)
- Stock count system crashes when offline, losing data
- Manual stock entry on desktop computer creates duplicate work
- No way to track when products were last counted

**Usage Scenario**
Marcus conducts a stock count in the warehouse's WiFi dead zone. He scans 50 products, adjusting stock levels on his tablet. The app works perfectly offline, queuing changes locally. When he returns to the WiFi zone 30 minutes later, all 50 updates sync automatically without data loss.

### 3.3 Primary: Customer Service Rep (Priya)

**Profile**
- Name: Priya, 24
- Role: Customer Service Representative
- Experience: 1 year at IKEA
- Tech comfort: High (digital native)

**Goals**
- Answer phone inquiries about product availability instantly
- Provide accurate information to reduce customer frustration
- Check multiple product variants quickly

**Pain Points**
- Desktop system is slow (5-10 second queries)
- Can't help customers while walking the floor
- No visibility into real-time stock changes
- System doesn't work if server is down

**Usage Scenario**
A customer calls asking if three different BILLY bookcases are in stock. Priya uses the tablet app to search "BILLY" and sees all variants with stock levels in 2 seconds. She confirms two are available and one is out of stock, saving the customer a wasted trip.

### 3.4 Secondary: Store Manager (David)

**Profile**
- Name: David, 42
- Role: Store Manager
- Experience: 15 years at IKEA
- Tech comfort: Medium

**Goals**
- Monitor inventory health across departments
- Identify products needing reorder before stockouts
- Review staff scan activity for process improvement
- Ensure data accuracy in inventory system

**Pain Points**
- No real-time visibility into stock levels
- Relies on end-of-day reports that are too late
- Can't track which products are scanned most frequently
- No insight into staff efficiency

**Usage Scenario** (Future Phase)
David opens a manager dashboard showing real-time low-stock alerts. He sees 12 products with critical inventory levels and can generate reorder requests directly from scan history data.

### 3.5 Future: Customer (Self-Service)

**Profile**
- Name: Lisa, 31
- Role: Customer
- Tech comfort: High

**Goals** (Phase 3)
- Find products independently without staff help
- Navigate to product location using AR or map
- Check stock before visiting store

**Features Needed**
- Customer-facing interface (simplified UI)
- AR navigation overlays
- QR code scanning at shelf locations
- Integration with IKEA mobile app

## 4. Functional Requirements

### 4.1 Core Features (MVP - Phase 1)

#### FR-1: Product Search
**Priority**: P0 (Critical)
**Status**: 70% Complete (UI done, backend integration needed)

**Requirements**
- FR-1.1: User can search products by name (minimum 2 characters)
- FR-1.2: Search results update in real-time with debounce (300ms delay)
- FR-1.3: Search matches product name, description, article number, category
- FR-1.4: Search results display within 100ms for local queries
- FR-1.5: Search works offline with locally cached data
- FR-1.6: Empty search shows all products (with pagination if > 50 items)
- FR-1.7: Search shows result count ("Showing X products")

**Acceptance Criteria**
- Typing "BILLY" returns all BILLY products within 100ms
- Search works identically online and offline
- Case-insensitive matching
- Special characters handled gracefully (Swedish characters å, ä, ö)

#### FR-2: Barcode Scanning
**Priority**: P0 (Critical)
**Status**: 60% Complete (Manual entry works, camera scanning not implemented)

**Requirements**
- FR-2.1: User can manually enter article number in format XXX.XXX.XX
- FR-2.2: Real-time format validation with visual feedback
- FR-2.3: Invalid format shows error: "Expected format: XXX.XXX.XX (e.g., 123.456.78)"
- FR-2.4: Pressing Enter or tapping Scan button submits article number
- FR-2.5: Recent scans stored locally (last 5 scans with timestamps)
- FR-2.6: User can tap recent scan to re-search
- FR-2.7: Camera scanning via device camera (Phase 1b)
- FR-2.8: Scan creates ScanEvent document in Couchbase with timestamp, user ID, location

**Acceptance Criteria**
- Scanning "123.456.78" immediately shows product details
- Invalid input "12345678" shows format error
- Recent scans persist across app sessions
- Scan history shows relative timestamps ("2m ago", "1h ago")

#### FR-3: Product Location Display
**Priority**: P0 (Critical)
**Status**: 90% Complete (UI implemented, verification logic needed)

**Requirements**
- FR-3.1: Product detail shows warehouse location: Aisle, Bay, Section
- FR-3.2: Location displayed prominently with large, readable numbers
- FR-3.3: Location format: Aisle (numeric), Bay (numeric), Section (letter)
- FR-3.4: Location verified against scan location (if GPS/BLE available)
- FR-3.5: Mismatch warning if scanned location ≠ stored location
- FR-3.6: Support for coordinates (x, y) for future map integration

**Acceptance Criteria**
- Aisle 12, Bay 3, Section A displayed clearly in product detail
- Staff can read location from 3 feet away on tablet
- Color coding: green (correct location), red (mismatch), gray (unverified)

#### FR-4: Stock Visibility
**Priority**: P0 (Critical)
**Status**: 80% Complete (Display works, updates not persisted)

**Requirements**
- FR-4.1: Display current stock quantity with unit label
- FR-4.2: Stock status badge: Out of Stock (0), Critical Low (1-4), Low (5-19), In Stock (20+)
- FR-4.3: Color coding: Red (out/critical), Yellow (low), Green (in stock)
- FR-4.4: Last stock check timestamp in relative format ("5m ago", "2h ago")
- FR-4.5: Warning alert if stock < 5 units: "Consider reordering soon"
- FR-4.6: Stock quantity visually prominent (40px+ font size)

**Acceptance Criteria**
- Stock level visible in both card view and detail view
- Out-of-stock products clearly marked with red badge
- Last checked time helps staff prioritize recounts

#### FR-5: Offline Operation
**Priority**: P0 (Critical)
**Status**: 40% Complete (Architecture in place, full sync not working)

**Requirements**
- FR-5.1: All product queries work offline from local Couchbase Edge database
- FR-5.2: Stock updates queued locally when offline, synced when online
- FR-5.3: Sync status indicator in header: Online/Offline/Syncing
- FR-5.4: Pending changes counter shows number of unsynced updates
- FR-5.5: Visual indicator on products with pending changes (yellow badge)
- FR-5.6: Automatic background sync every 30 seconds when online
- FR-5.7: Manual sync trigger button
- FR-5.8: Sync conflict resolution (last-write-wins with revision tracking)
- FR-5.9: Stale data warning if last sync > 10 minutes ago

**Acceptance Criteria**
- App functions identically in airplane mode vs online
- Stock update while offline syncs within 30 seconds of reconnection
- No data loss during network interruptions
- Sync status always visible and accurate

#### FR-6: Stock Level Updates
**Priority**: P1 (High)
**Status**: 30% Complete (UI exists, no backend persistence)

**Requirements**
- FR-6.1: +/- buttons to adjust stock quantity
- FR-6.2: Cannot reduce stock below 0
- FR-6.3: Large touch targets (44x44px minimum)
- FR-6.4: Optimistic UI update (instant feedback)
- FR-6.5: Update writes to Couchbase with new revision
- FR-6.6: Update includes timestamp, user ID, device ID
- FR-6.7: Failed updates show error toast with retry option
- FR-6.8: Disabled state while update in progress

**Acceptance Criteria**
- Tapping + increases quantity instantly
- Update persists after app restart
- Works offline with sync when reconnected
- Visual feedback for success/failure

### 4.2 Enhanced Features (Phase 2)

#### FR-7: Advanced Stock Management
**Priority**: P2 (Medium)
**Status**: Not Started

**Requirements**
- FR-7.1: Bulk stock update mode (scan multiple products in sequence)
- FR-7.2: Stock adjustment reasons (recount, damage, theft, sale)
- FR-7.3: Stock history view (last 10 adjustments with timestamps)
- FR-7.4: Low stock notifications push to staff devices
- FR-7.5: Reorder threshold configuration per product
- FR-7.6: Export stock count to CSV for manager review

#### FR-8: Scan History & Analytics
**Priority**: P2 (Medium)
**Status**: Not Started

**Requirements**
- FR-8.1: View personal scan history (last 50 scans)
- FR-8.2: Filter scans by date range, product, location
- FR-8.3: Scan frequency heatmap (most scanned products)
- FR-8.4: Average scan-to-locate time metric
- FR-8.5: Manager view: team scan activity dashboard
- FR-8.6: Identify products with frequent stock mismatches

#### FR-9: Multi-Store Lookup
**Priority**: P2 (Medium)
**Status**: Not Started

**Requirements**
- FR-9.1: Search product availability across nearby stores
- FR-9.2: Show stock levels for 5 nearest stores
- FR-9.3: Estimated distance and drive time to other stores
- FR-9.4: Suggest alternative store if local stock is 0
- FR-9.5: Transfer request to move stock between stores

#### FR-10: User Authentication & Permissions
**Priority**: P2 (Medium)
**Status**: Not Started

**Requirements**
- FR-10.1: Staff login with employee ID + PIN
- FR-10.2: Role-based access: Floor Staff, Warehouse, Manager, Admin
- FR-10.3: Permissions: Floor (read-only), Warehouse (stock updates), Manager (reports), Admin (all)
- FR-10.4: Audit log of all stock changes by user
- FR-10.5: Session timeout after 4 hours of inactivity
- FR-10.6: Biometric authentication option (Touch ID, Face ID)

### 4.3 Future Features (Phase 3)

#### FR-11: BLE Indoor Positioning
**Priority**: P3 (Low)
**Status**: Not Started

**Requirements**
- FR-11.1: Bluetooth beacon network in warehouse
- FR-11.2: Real-time staff position tracking (±2 meter accuracy)
- FR-11.3: Automatic location verification when scanning product
- FR-11.4: Alert if staff scans product far from expected location (>10 meters)
- FR-11.5: Heatmap of staff movement patterns for store layout optimization

#### FR-12: AR Navigation
**Priority**: P3 (Low)
**Status**: Not Started

**Requirements**
- FR-12.1: AR camera overlay showing path to product location
- FR-12.2: Directional arrows and distance indicators
- FR-12.3: Works with ARCore (Android) and ARKit (iOS)
- FR-12.4: Turn-by-turn navigation from current position
- FR-12.5: Visual markers at Aisle/Bay intersections
- FR-12.6: Fallback to 2D map if AR not supported

#### FR-13: Edge AI Recommendations
**Priority**: P3 (Low)
**Status**: Not Started

**Requirements**
- FR-13.1: On-device ML model for product recommendations
- FR-13.2: "Customers who bought X also bought Y" suggestions
- FR-13.3: Predictive stock alerts based on historical patterns
- FR-13.4: Smart search with typo correction and synonym matching
- FR-13.5: Image-based product search (snap photo → find similar)
- FR-13.6: Voice search integration

#### FR-14: Customer Self-Service Mode
**Priority**: P3 (Low)
**Status**: Not Started

**Requirements**
- FR-14.1: Simplified UI for customer-facing kiosks
- FR-14.2: Read-only access (no stock updates)
- FR-14.3: Print product location map
- FR-14.4: QR code generation for mobile handoff
- FR-14.5: Integration with IKEA Family app
- FR-14.6: Multilingual support (Swedish, English, German, etc.)

## 5. Non-Functional Requirements

### 5.1 Performance

**NFR-P1: Response Time**
- Local product query: < 100ms (p95)
- Search with debounce: < 300ms total delay (p95)
- Stock update write: < 200ms (p95)
- Sync operation: < 5 seconds for 100 pending changes (p95)
- App cold start: < 2 seconds to interactive (p95)

**NFR-P2: Throughput**
- Support 50 concurrent users per store
- Handle 1000+ product searches per hour
- Process 500+ stock updates per hour
- Sync 100 changes in single batch without blocking UI

**NFR-P3: Resource Usage**
- App bundle size: < 5MB (React app)
- Local database size: < 50MB for 1000 products
- Memory usage: < 200MB RAM on device
- Battery impact: < 5% drain per hour of active use
- Network usage: < 1MB per sync (delta sync only)

### 5.2 Reliability

**NFR-R1: Availability**
- Offline availability: 100% (complete functionality without network)
- Online availability: 99.9% uptime for sync operations
- Graceful degradation: All features work offline, sync resumes automatically

**NFR-R2: Data Integrity**
- Zero data loss during offline operation
- Conflict resolution: 100% of conflicts auto-resolved via revision tracking
- Sync accuracy: 100% of queued changes successfully synced
- Data validation: 100% of writes validated against Pydantic schemas

**NFR-R3: Error Handling**
- Network timeout: Retry 3 times with exponential backoff (1s, 2s, 4s)
- Failed sync: Queue changes locally, show error toast, allow manual retry
- Invalid barcode: Show clear error message with format example
- Edge Server down: Fall back to last synced data, show stale warning

**NFR-R4: Fault Tolerance**
- App crash: Automatically restore state from local database on restart
- Sync interruption: Resume sync from last successful checkpoint
- Corrupt data: Detect and report corruption, attempt recovery from backend

### 5.3 Security

**NFR-S1: Authentication**
- User authentication required for all operations (Phase 2)
- Session tokens expire after 4 hours of inactivity
- Biometric authentication supported on compatible devices
- Password policy: Minimum 8 characters, alphanumeric + special

**NFR-S2: Authorization**
- Role-based access control (Floor, Warehouse, Manager, Admin)
- Audit log of all stock changes with user ID, timestamp, device ID
- Least privilege principle: Floor staff read-only, Warehouse can update stock

**NFR-S3: Data Protection**
- Local database encrypted at rest (AES-256)
- Network traffic encrypted with TLS 1.3
- No sensitive data logged in application logs
- GDPR compliance: No personal data stored without consent

**NFR-S4: Input Validation**
- All user inputs validated against Pydantic schemas
- SQL injection prevention (N1QL parameterization)
- XSS prevention via React auto-escaping
- Article number format strictly enforced (XXX.XXX.XX)

### 5.4 Scalability

**NFR-SC1: Data Volume**
- Support 1000 products per store initially
- Scale to 10,000 products with pagination
- Handle 100,000 scan events per month per store
- Retain 12 months of scan history

**NFR-SC2: User Load**
- Support 50 concurrent users per store
- Scale to 100 users with no performance degradation
- Handle 10 stores (500 concurrent users) on single Couchbase cluster

**NFR-SC3: Geographic Distribution**
- Multi-store deployment: Each store has dedicated Edge Server
- Central Couchbase cluster for all stores
- Cross-store sync latency: < 30 seconds
- Support 100+ stores in single country

### 5.5 Usability

**NFR-U1: Learnability**
- New staff can complete first product scan in < 1 minute
- No training required for basic search/scan operations
- Contextual help tooltips on complex features
- Onboarding tutorial on first launch (skippable)

**NFR-U2: Accessibility**
- WCAG 2.1 Level AA compliance
- Screen reader support (ARIA labels on all interactive elements)
- Keyboard navigation for all functions
- Minimum touch target size: 44x44px
- Color contrast ratio: 4.5:1 for text, 3:1 for UI components
- Font size: Minimum 16px for body text, 40px+ for critical info (stock, location)

**NFR-U3: Device Support**
- iOS 14+ (iPhone 8 and newer)
- Android 10+ (devices with 2GB+ RAM)
- Tablet optimization: iPad, Samsung Galaxy Tab
- Progressive Web App (PWA) for desktop browsers

**NFR-U4: Internationalization**
- Swedish language primary (Phase 1)
- English support (Phase 1)
- RTL language support (Phase 3: Arabic, Hebrew)
- Currency localization (SEK, USD, EUR, etc.)
- Date/time formatting per locale

### 5.6 Maintainability

**NFR-M1: Code Quality**
- TypeScript strict mode enabled
- ESLint + Prettier for consistent formatting
- Code coverage: > 80% for critical paths
- No high-severity linting warnings in production builds

**NFR-M2: Monitoring & Logging**
- Application performance monitoring (APM) integration
- Error tracking with stack traces (Sentry or similar)
- Structured logging with correlation IDs
- Sync success/failure metrics dashboard

**NFR-M3: Documentation**
- Inline code documentation (JSDoc/TSDoc)
- Architecture decision records (ADRs)
- Deployment runbooks
- API documentation (OpenAPI for FastAPI endpoints)

**NFR-M4: Testability**
- Unit test coverage: > 80%
- Integration tests for Couchbase sync operations
- E2E tests for critical user journeys
- Offline scenario testing

## 6. Technical Requirements

### 6.1 Frontend Specifications

**Tech Stack**
- Framework: React 18.3+
- Routing: React Router 7
- UI Library: shadcn/ui (Radix UI primitives)
- Styling: Tailwind CSS 3.4+
- Build Tool: Vite 5+
- Language: TypeScript 5.3+ (strict mode)
- HTTP Client: Native fetch API with custom wrapper
- State Management: React hooks (useState, useEffect, useContext)
- Form Validation: React Hook Form + Zod (optional)
- Date Handling: date-fns

**Browser Support**
- Chrome 90+
- Safari 14+
- Firefox 88+
- Edge 90+
- Mobile: iOS Safari 14+, Chrome Android 90+

**Build Requirements**
- Bundle size: < 5MB total (code-splitting for routes)
- Tree-shaking enabled
- Production build minified and obfuscated
- Source maps generated for error tracking
- PWA manifest for installability

**Performance Budgets**
- First Contentful Paint (FCP): < 1.5s
- Largest Contentful Paint (LCP): < 2.5s
- Time to Interactive (TTI): < 3.5s
- Cumulative Layout Shift (CLS): < 0.1

### 6.2 Backend Specifications

**Tech Stack**
- Framework: FastAPI 0.110+
- Language: Python 3.11+
- Data Validation: Pydantic 2.6+
- Async Runtime: uvicorn with asyncio
- HTTP Client: httpx for Couchbase REST API calls
- Testing: pytest, pytest-asyncio

**API Endpoints** (Optional - Direct Couchbase access preferred)
- `GET /api/products` - List all products
- `GET /api/products/{article_number}` - Get product by article number
- `PUT /api/products/{article_number}` - Update product
- `POST /api/scans` - Create scan event
- `GET /api/sync/status` - Get sync status

**Service Requirements**
- Health check endpoint: `GET /health`
- Metrics endpoint: `GET /metrics` (Prometheus format)
- OpenAPI documentation: `/docs`
- CORS enabled for React app origin
- Request timeout: 30 seconds
- Connection pooling for Couchbase connections

### 6.3 Database/Sync Requirements

**Couchbase Edge Server**
- Version: Couchbase Lite 3.1+
- Database Name: `ikea_products`
- Port: 59840 (default)
- Replication Type: Push-pull (bidirectional sync)
- Conflict Resolution: Last-write-wins (revision-based)
- Channels: Store-specific (e.g., `store:001`)

**Document Design**
```json
// Product Document (product:XXX.XXX.XX)
{
  "_id": "product:123.456.78",
  "_rev": "1-abc123",
  "type": "product",
  "articleNumber": "123.456.78",
  "name": "BILLY Bookcase",
  "description": "White, 80x28x202 cm",
  "location": {
    "aisle": 12,
    "bay": 3,
    "section": "A",
    "coordinates": {"x": 45.2, "y": 78.5}
  },
  "stock": 23,
  "lastStockCheck": "2026-03-03T10:30:00Z",
  "price": 599.0,
  "currency": "SEK",
  "category": "Storage & Organization",
  "imageUrl": "https://ikea.com/images/billy.jpg",
  "_syncedAt": "2026-03-03T10:30:00Z",
  "_pendingSync": false
}

// Scan Event Document (scan:timestamp-uuid)
{
  "_id": "scan:1709437800000-abc123",
  "_rev": "1-def456",
  "type": "scan",
  "productId": "product:123.456.78",
  "articleNumber": "123.456.78",
  "userId": "user123",
  "timestamp": "2026-03-03T10:30:00Z",
  "location": {"aisle": 12, "bay": 3, "section": "A"},
  "deviceId": "device-001",
  "notes": "Stock check scan",
  "_syncedAt": "2026-03-03T10:30:05Z",
  "_pendingSync": false
}
```

**Indexing Strategy**
- Primary index: `_id` (automatic)
- Secondary indexes:
  - `articleNumber` (unique)
  - `type` (product vs scan)
  - `category` (for filtering)
  - `stock` (for low-stock queries)
  - `timestamp` (for scan history)

**Sync Configuration**
- Continuous sync: Enabled
- Heartbeat interval: 30 seconds
- Retry delay: 5 seconds exponential backoff
- Conflict resolver: Default (last-write-wins with revision comparison)
- Attachments: Support for product images (future)

**Data Freshness Policy**
- Stock levels: Sync immediately (real-time)
- Product metadata: Sync every 5 minutes
- Scan events: Sync within 30 seconds
- Stale data threshold: 10 minutes (show warning)

### 6.4 Integration Points

**Current Integrations**
- Couchbase Edge Server REST API (http://127.0.0.1:59840)
- Couchbase Sync Gateway (for backend sync)
- Couchbase Server (central data store)

**Future Integrations (Phase 2-3)**
- BLE Beacon API (indoor positioning)
- Camera API (barcode scanning via @zxing/browser or similar)
- AR API (ARCore/ARKit for navigation)
- Push Notification Service (low stock alerts)
- IKEA Central Inventory System (ERP integration)
- Analytics Platform (Mixpanel, Amplitude, or custom)
- Error Tracking (Sentry)
- APM (Datadog, New Relic)

**API Versioning**
- REST API: Versioned via URL path (`/api/v1/products`)
- Couchbase document schema: Version field in document (future migrations)
- Sync protocol: Follows Couchbase Lite version compatibility matrix

## 7. Data Requirements

### 7.1 Product Schema

**Pydantic Model** (Source of truth - Python)
```python
class ProductLocation(BaseModel):
    aisle: int
    bay: int
    section: str
    coordinates: Optional[dict[str, float]] = None

class Product(BaseModel):
    id: str = Field(alias="_id")
    rev: Optional[str] = Field(None, alias="_rev")
    type: Literal["product"] = "product"
    article_number: str = Field(alias="articleNumber")
    name: str
    description: str
    location: ProductLocation
    stock: int
    last_stock_check: Optional[str] = Field(None, alias="lastStockCheck")
    price: float
    currency: str
    category: str
    image_url: Optional[str] = Field(None, alias="imageUrl")
    synced_at: Optional[str] = Field(None, alias="_syncedAt")
    pending_sync: bool = Field(False, alias="_pendingSync")
```

**TypeScript Interface** (Must match Python model)
```typescript
interface ProductLocation {
  aisle: number;
  bay: number;
  section: string;
  coordinates?: { x: number; y: number };
}

interface Product {
  _id: string;
  _rev?: string;
  type: "product";
  articleNumber: string;
  name: string;
  description: string;
  location: ProductLocation;
  stock: number;
  lastStockCheck?: string;
  price: number;
  currency: string;
  category: string;
  imageUrl?: string;
  _syncedAt?: string;
  _pendingSync?: boolean;
}
```

**Field Validation Rules**
- `_id`: Format `product:XXX.XXX.XX` (e.g., `product:123.456.78`)
- `articleNumber`: Regex `^\d{3}\.\d{3}\.\d{2}$`
- `stock`: Integer >= 0
- `price`: Float > 0
- `currency`: 3-letter uppercase code (SEK, USD, EUR)
- `lastStockCheck`, `_syncedAt`: ISO 8601 timestamp with Z suffix
- `location.aisle`: Integer 1-99
- `location.bay`: Integer 1-99
- `location.section`: String 1-3 characters (A, B, AA, etc.)

### 7.2 Sync Requirements

**Conflict Resolution Strategy**
- Mechanism: Automatic last-write-wins via Couchbase revision tracking
- Revision format: `{generation}-{hash}` (e.g., `3-abc123`)
- Conflict detection: Compare `_rev` values on write
- Resolution: Higher generation number wins; if equal, lexicographically higher hash wins
- User notification: None (automatic resolution)
- Audit trail: Log conflicts in separate `conflict` document type (Phase 2)

**Sync Triggers**
- Automatic: Every 30 seconds when online
- On reconnection: Immediate sync when network restored
- Manual: User taps sync button in header
- On write: Immediate attempt to sync new stock update
- Background: Use Web Background Sync API (PWA) when available

**Sync Prioritization**
1. Stock updates (real-time)
2. Scan events (30 second delay acceptable)
3. Product metadata (5 minute delay acceptable)

**Network Handling**
- Online detection: `navigator.onLine` + periodic ping to Edge Server
- Offline queue: IndexedDB-backed queue for pending operations
- Retry policy: 3 attempts with exponential backoff (1s, 2s, 4s)
- Batch sync: Group up to 50 changes in single request
- Bandwidth optimization: Delta sync (only changed fields)

### 7.3 Data Freshness Policies

**Real-Time Data** (< 1 second staleness acceptable)
- Stock levels after user update
- Scan events
- Sync status

**Near-Real-Time Data** (< 5 minutes staleness acceptable)
- Product metadata (name, description, price)
- Product images

**Batch Data** (< 1 hour staleness acceptable)
- Scan history aggregations
- Low stock reports
- Analytics data

**Stale Data Handling**
- Warning threshold: 10 minutes since last sync
- UI indicator: Orange badge "Last synced 12 minutes ago"
- User action: Option to force manual sync
- Automatic refresh: Attempt sync every 60 seconds when stale

**Cache Invalidation**
- Product update: Invalidate immediately on write
- Full refresh: Every 24 hours (overnight sync)
- Selective refresh: When user pulls-to-refresh (mobile pattern)

### 7.4 Data Retention

**Local Device**
- Products: Retain all (synced from backend)
- Scan events: Last 30 days
- Search history: Last 50 searches
- Recent scans: Last 5 scans (localStorage)

**Backend (Couchbase Server)**
- Products: Indefinite retention
- Scan events: 12 months, then archive to cold storage
- Audit logs: 24 months
- Sync conflicts: 90 days

**Cleanup Strategy**
- Local: Auto-purge scans > 30 days old on app start
- Backend: Scheduled job deletes scans > 12 months (monthly)
- User-triggered: Option to clear local cache and re-sync

## 8. UI/UX Requirements

### 8.1 Mobile-First Design

**Design Principles**
- Touch-first: All interactions optimized for finger taps (44x44px minimum)
- Thumb zone: Critical actions within easy thumb reach on 6" screens
- One-handed operation: Primary tasks completable with one hand
- Progressive disclosure: Show essential info first, details on demand
- Forgiving interface: Large tap targets, undo actions, confirm destructive operations

**Responsive Breakpoints**
- Mobile: 320px - 767px (primary target)
- Tablet: 768px - 1023px
- Desktop: 1024px+ (secondary, for managers)

**Layout Patterns**
- Search bar: Sticky at top, always accessible
- Product grid: 1 column (mobile), 2 columns (tablet), 3 columns (desktop)
- Product detail: Full-screen drawer on mobile, modal on desktop
- Sync status: Fixed header, always visible

**Touch Gestures**
- Pull-to-refresh: Trigger sync
- Swipe down: Dismiss product detail drawer
- Long press: Show contextual menu (future)
- Pinch-to-zoom: Product images

### 8.2 Accessibility (WCAG 2.1 AA)

**Visual Accessibility**
- Color contrast: 4.5:1 for text, 3:1 for UI components
- Color independence: Never rely on color alone (use icons + text)
- Focus indicators: 2px solid outline on all focusable elements
- Text scaling: Support up to 200% zoom without breaking layout
- Font size: Minimum 16px body text, 14px for labels
- Critical info (stock, location): 40px+ font size

**Screen Reader Support**
- ARIA labels: All buttons, inputs, icons have descriptive labels
- ARIA live regions: Sync status, search results count, error messages
- ARIA roles: Proper semantic markup (button, navigation, main, etc.)
- Heading hierarchy: Logical H1-H6 structure
- Alt text: All images have descriptive alt text
- Skip links: "Skip to main content" for keyboard users

**Keyboard Navigation**
- Tab order: Logical left-to-right, top-to-bottom
- Focus trap: Product detail drawer traps focus until dismissed
- Escape key: Close modals and drawers
- Enter key: Submit forms, activate buttons
- Arrow keys: Navigate product grid (optional enhancement)

**Motor Accessibility**
- Large tap targets: 44x44px minimum (WCAG AAA)
- Spacing: 8px minimum between interactive elements
- No time limits: No auto-dismiss alerts, no timeout on scans
- Undo actions: Accidental stock changes can be reversed
- Voice input: Support for speech-to-text in search (browser native)

**Cognitive Accessibility**
- Simple language: Grade 8 reading level or lower
- Consistent UI: Same patterns throughout (e.g., all drawers dismiss the same way)
- Clear errors: Specific, actionable error messages
- Visual hierarchy: Size and contrast guide user attention
- No flashing content: Avoid animations faster than 3Hz (seizure risk)

### 8.3 Offline Indicators

**Sync Status Header**
- Position: Fixed at top of screen
- Height: 48px
- Content: Sync badge + pending changes count + connection indicator
- Color coding:
  - Green dot + "Synced": Online and up-to-date
  - Blue spinner + "Syncing...": Sync in progress
  - Yellow dot + "Offline": No network, working locally
  - Orange clock + "Last sync 12m ago": Stale data warning
  - Red alert + "Sync Error": Failed to sync, show error message

**Product-Level Indicators**
- Yellow badge on product card: "Pending Sync"
- Appears on products with unsaved stock changes
- Disappears after successful sync
- Tooltip on hover/tap: "This product has changes that haven't synced yet"

**Sync Controls**
- Manual sync button: Refresh icon in header, tap to force sync
- Pull-to-refresh: Swipe down on product list to sync
- Retry button: On sync error toast notification
- Sync progress: Indeterminate spinner during sync

**Network Change Notifications**
- Toast on offline: "You're offline. Changes will sync when reconnected."
- Toast on online: "You're back online. Syncing changes..."
- Auto-dismiss: Toast disappears after 3 seconds
- Persistent: Sync status header always visible

### 8.4 Error States

**Network Errors**
- Message: "Unable to reach server. Working offline with local data."
- Icon: WiFi off icon (red)
- Action: "Retry" button
- Fallback: Continue working with stale data, show last sync time

**Search Errors**
- No results:
  - Icon: Package icon (gray)
  - Message: "No products found"
  - Suggestion: "Try a different search term or article number"
- Invalid barcode:
  - Message: "Invalid format. Expected: XXX.XXX.XX (e.g., 123.456.78)"
  - Color: Red border on input
  - Action: Clear and allow re-entry

**Data Errors**
- Product not found:
  - Message: "Product {articleNumber} not found in database"
  - Action: "Search again" button
- Corrupt data:
  - Message: "This product data appears corrupted. Please contact support."
  - Action: "Report issue" button (copies error to clipboard)

**Sync Errors**
- Conflict:
  - Message: "This product was updated by another user. Your changes were saved with the latest version."
  - Icon: Info icon (blue)
  - Auto-dismiss: 5 seconds
- Server error:
  - Message: "Server error during sync. Retrying automatically..."
  - Action: Manual retry button
  - Retry: Automatic retry 3 times with exponential backoff

**Form Errors**
- Inline validation: Show error below input field
- Color: Red text and red border
- Icon: Alert circle icon
- Timing: Show on blur or after 500ms of typing
- Clear: Error disappears when user corrects input

**Error Recovery**
- Auto-recovery: Automatic retry for transient errors (network, timeout)
- Manual recovery: Retry button for persistent errors
- Graceful degradation: Continue working offline if backend unavailable
- Error logging: All errors logged to console and sent to error tracking service

## 9. Testing Requirements

### 9.1 Unit Testing

**Scope**
- All utility functions (date formatting, validation, etc.)
- Pydantic model validation logic
- React hooks (useProducts, useSyncStatus, etc.)
- Couchbase client functions (getDocument, putDocument, etc.)

**Coverage Target**: 80% line coverage minimum

**Tools**
- Frontend: Vitest + React Testing Library
- Backend: pytest + pytest-asyncio

**Test Categories**
- Happy path: Valid inputs produce expected outputs
- Edge cases: Empty arrays, null values, boundary conditions
- Error handling: Invalid inputs throw expected errors
- Async operations: Promises resolve/reject correctly

**Example Test Cases**
- `validateArticleNumber("123.456.78")` returns `true`
- `validateArticleNumber("12345678")` returns `false`
- `useProducts()` fetches products on mount
- `putDocument()` retries 3 times on network error

### 9.2 Integration Testing

**Scope**
- Couchbase Edge Server CRUD operations
- Sync workflow: Write → Queue → Sync → Verify
- Authentication flow (Phase 2)
- Conflict resolution scenarios

**Tools**
- Frontend: Playwright or Cypress
- Backend: pytest with test Couchbase instance
- Docker: Containerized Couchbase for isolated tests

**Test Scenarios**
- Write product update → Verify in Couchbase Edge Server
- Sync offline changes → Verify all changes persisted
- Concurrent writes → Verify conflict resolution
- Network interruption → Verify queue and resume

**Test Data**
- Seed database with 50 test products
- Reset database between test runs
- Use dedicated test namespace (e.g., `test:product:123.456.78`)

### 9.3 End-to-End Testing

**Scope**
- Critical user journeys from UI to database
- Cross-browser compatibility
- Mobile device testing (iOS, Android)

**Tools**
- Playwright (preferred for PWA testing)
- BrowserStack for device cloud testing

**Test Scenarios**

**Scenario 1: Staff Product Lookup**
1. Open app → Verify home screen loads
2. Enter "BILLY" in search → Verify results appear
3. Tap product card → Verify detail drawer opens
4. Verify location displayed: Aisle, Bay, Section
5. Verify stock quantity and status badge
6. Close drawer → Verify returns to search results

**Scenario 2: Barcode Scan**
1. Open app → Navigate to scan tab
2. Enter article number "123.456.78" → Tap Scan
3. Verify product details appear immediately
4. Verify recent scans list shows new entry
5. Tap recent scan → Verify re-searches product

**Scenario 3: Stock Update**
1. Search for product → Open detail
2. Tap + button → Verify stock increases by 1
3. Verify "Pending Sync" badge appears (if offline)
4. Wait for sync → Verify badge disappears
5. Refresh → Verify stock persisted

**Scenario 4: Offline Operation**
1. Enable airplane mode
2. Search for product → Verify works from cache
3. Update stock → Verify optimistic update
4. Verify "Offline" badge in header
5. Disable airplane mode → Verify auto-sync
6. Verify "Synced" badge appears

**Scenario 5: Error Handling**
1. Search for invalid article number "99999999"
2. Verify "Invalid format" error
3. Search for non-existent product "999.999.99"
4. Verify "No products found" message

**Cross-Browser Matrix**
- Chrome (Windows, Mac, Android)
- Safari (Mac, iOS)
- Firefox (Windows, Mac)
- Edge (Windows)

### 9.4 Offline Scenario Testing

**Critical Offline Tests**

**Test 1: App Launch Offline**
- Start with no network
- Verify app loads from cache
- Verify products display from local database
- Verify search works
- Verify "Offline" indicator shows

**Test 2: Go Offline Mid-Session**
1. Start online with app running
2. Disable network
3. Verify "Offline" toast notification
4. Update stock
5. Verify change queued locally
6. Re-enable network
7. Verify auto-sync completes

**Test 3: Multiple Offline Changes**
1. Go offline
2. Update stock on 5 different products
3. Verify all 5 show "Pending Sync"
4. Go online
5. Verify all 5 sync successfully
6. Verify badges clear

**Test 4: Sync Conflict**
1. Device A and Device B start offline
2. Both update same product stock (different values)
3. Device A goes online → Syncs first
4. Device B goes online → Syncs second
5. Verify last-write-wins (Device B value persisted)
6. Verify no errors shown to users

**Test 5: Extended Offline Period**
1. Go offline for 1 hour
2. Backend updates 10 products
3. Device comes online
4. Verify pull sync receives backend updates
5. Verify local changes still pushed
6. Verify no data loss

**Test 6: Network Interruption During Sync**
1. Start sync with 20 pending changes
2. Interrupt network mid-sync (after 10 changes)
3. Verify sync pauses gracefully
4. Restore network
5. Verify sync resumes from checkpoint (remaining 10 changes)

### 9.5 Performance Benchmarks

**Load Testing**
- 1000 products in database
- Measure search response time (target: < 100ms p95)
- Measure initial load time (target: < 2s)
- 50 concurrent users simulated (target: no degradation)

**Sync Performance**
- 100 pending changes queued
- Measure sync completion time (target: < 5s)
- Measure memory usage (target: < 200MB)
- Verify no UI blocking during sync

**Network Conditions**
- Test on 3G (slow connection) → Verify sync completes within 10s
- Test on WiFi → Verify sync completes within 5s
- Test on 4G → Verify sync completes within 5s
- Test with high latency (500ms) → Verify retry logic works

**Tools**
- Lighthouse: PWA performance audits
- WebPageTest: Network throttling tests
- Couchbase Lite benchmarks: Sync throughput testing

## 10. Success Metrics

### 10.1 KPIs for Staff Efficiency

**Time Savings**
- **Metric**: Average time to locate product
- **Baseline**: 5 minutes (current manual process)
- **Target**: < 30 seconds (10x improvement)
- **Measurement**: Track from scan/search initiation to location displayed

**Search Efficiency**
- **Metric**: Percentage of searches resulting in product found
- **Target**: > 95% success rate
- **Measurement**: (Successful searches / Total searches) * 100

**Stock Accuracy**
- **Metric**: Stock count discrepancy rate
- **Baseline**: 15% (industry average)
- **Target**: < 5% discrepancy
- **Measurement**: Compare app stock levels vs physical counts

**User Adoption**
- **Metric**: Daily active users (DAU) among store staff
- **Target**: > 80% of staff using app daily within 3 months
- **Measurement**: Track unique users per day

**Scan Volume**
- **Metric**: Number of scans per staff per shift
- **Target**: > 50 scans per 8-hour shift
- **Measurement**: Count of ScanEvent documents per user per day

**Customer Service Impact**
- **Metric**: Average customer wait time for product location
- **Baseline**: 10 minutes
- **Target**: < 2 minutes
- **Measurement**: Customer service surveys and observation

### 10.2 Technical Metrics

**Performance**
- **Query Response Time**: p95 < 100ms (local), p95 < 500ms (network)
- **App Load Time**: p95 < 2 seconds to interactive
- **Sync Latency**: p95 < 5 seconds for 100 changes
- **Memory Usage**: p95 < 200MB RAM
- **Battery Drain**: < 5% per hour active use

**Reliability**
- **Offline Availability**: 100% uptime (local operations)
- **Sync Success Rate**: > 99.5% of changes synced successfully
- **Crash-Free Sessions**: > 99.9% of sessions without crashes
- **Error Rate**: < 0.1% of operations result in errors

**Sync Performance**
- **Sync Frequency**: Every 30 seconds when online
- **Sync Completion**: > 95% of syncs complete within 5 seconds
- **Conflict Rate**: < 1% of writes result in conflicts
- **Data Loss**: 0% (zero tolerance)

**Scalability**
- **Concurrent Users**: Support 50 users per store without degradation
- **Database Size**: < 50MB for 1000 products
- **Sync Throughput**: > 100 changes per second
- **Search Performance**: < 100ms for 1000 products

**User Experience**
- **App Rating**: > 4.5 stars (if published to app store)
- **Net Promoter Score (NPS)**: > 50 among staff users
- **Task Success Rate**: > 95% of user tasks completed successfully
- **User Error Rate**: < 5% of operations result in user errors

### 10.3 Business Metrics

**Cost Savings**
- **Labor Efficiency**: Reduce staff time spent locating products by 80%
- **Stock Accuracy**: Reduce inventory write-offs by 50% (better stock counts)
- **Customer Satisfaction**: Increase CSAT score by 20% (faster service)

**Operational Impact**
- **Stock Turnover**: Increase by 15% (better inventory visibility)
- **Reorder Accuracy**: Reduce stockouts by 30% (real-time low stock alerts)
- **Staff Productivity**: Increase items processed per hour by 25%

## 11. Risks and Mitigations

### 11.1 Technical Risks

**Risk T1: Couchbase Edge Server Instability**
- **Severity**: High
- **Likelihood**: Medium
- **Impact**: App unusable if Edge Server crashes
- **Mitigation**:
  - Implement health checks every 10 seconds
  - Auto-restart Edge Server on crash (Docker restart policy)
  - Fallback to read-only mode with stale data if Edge Server down
  - Alert monitoring team on repeated failures
- **Owner**: Backend Team

**Risk T2: Sync Conflicts and Data Loss**
- **Severity**: High
- **Likelihood**: Medium
- **Impact**: Stock levels incorrect, staff confusion
- **Mitigation**:
  - Implement robust conflict resolution (last-write-wins)
  - Log all conflicts for manual review
  - Add optimistic locking for critical operations
  - Comprehensive offline scenario testing
- **Owner**: Data Team

**Risk T3: Poor Network Coverage in Warehouse**
- **Severity**: Medium
- **Likelihood**: High
- **Impact**: Frequent offline periods, delayed sync
- **Mitigation**:
  - Design for offline-first (primary mitigation)
  - Increase WiFi access point density in warehouse
  - Queue all changes locally with robust retry logic
  - Educate staff on offline capabilities
- **Owner**: Infrastructure Team

**Risk T4: Type Mismatch Between Frontend and Backend**
- **Severity**: Medium
- **Likelihood**: High (already exists)
- **Impact**: Runtime errors, data corruption
- **Mitigation**:
  - Align TypeScript types with Pydantic models immediately
  - Generate TypeScript types from Pydantic (e.g., pydantic-to-typescript)
  - Add integration tests to catch schema drift
  - Enforce strict validation on both ends
- **Owner**: Full Stack Team

**Risk T5: Performance Degradation at Scale**
- **Severity**: Medium
- **Likelihood**: Low
- **Impact**: Slow app with 1000+ products
- **Mitigation**:
  - Implement pagination (50 products per page)
  - Add indexing on search fields (articleNumber, name)
  - Lazy load product images
  - Monitor performance metrics continuously
- **Owner**: Frontend Team

### 11.2 User Adoption Risks

**Risk U1: Staff Resistance to New Technology**
- **Severity**: High
- **Likelihood**: Medium
- **Impact**: Low adoption, continued use of old methods
- **Mitigation**:
  - Involve staff in beta testing and gather feedback
  - Conduct hands-on training sessions (< 5 minutes)
  - Create quick reference cards (laminated cheat sheets)
  - Identify and empower internal champions
  - Demonstrate time savings with before/after metrics
- **Owner**: Product Manager + Store Operations

**Risk U2: Confusing UI/UX**
- **Severity**: Medium
- **Likelihood**: Low
- **Impact**: User errors, frustration, low adoption
- **Mitigation**:
  - Conduct user testing with 10+ staff members before launch
  - Iterate on UI based on feedback
  - Follow established mobile app patterns (iOS/Android guidelines)
  - Provide contextual help tooltips
  - A/B test critical flows
- **Owner**: UX Designer

**Risk U3: Device Availability**
- **Severity**: Medium
- **Likelihood**: Medium
- **Impact**: Not enough tablets for all staff
- **Mitigation**:
  - Conduct device needs assessment per store
  - Budget for 1 device per 2-3 floor staff
  - Implement shared device model with easy user switching
  - Support BYOD (bring your own device) for staff
- **Owner**: Store Operations + IT

### 11.3 Data Consistency Risks

**Risk D1: Stale Data Shown to Users**
- **Severity**: Medium
- **Likelihood**: High (in offline scenarios)
- **Impact**: Staff give incorrect info to customers
- **Mitigation**:
  - Show last sync time prominently in UI
  - Display warning if data > 10 minutes old
  - Implement pull-to-refresh for manual sync
  - Auto-sync every 30 seconds when online
- **Owner**: Frontend Team

**Risk D2: Stock Count Drift**
- **Severity**: High
- **Likelihood**: Medium
- **Impact**: Stock levels in app diverge from reality
- **Mitigation**:
  - Require daily full stock counts for critical items
  - Compare app stock vs POS sales data nightly
  - Alert on anomalies (e.g., stock increase without receiving)
  - Periodic manual audits
- **Owner**: Store Operations

**Risk D3: Multi-Device Concurrency Issues**
- **Severity**: Medium
- **Likelihood**: Medium
- **Impact**: Two staff update same product simultaneously → conflict
- **Mitigation**:
  - Implement optimistic locking with revision checking
  - Log conflicts for manual review
  - Educate staff on conflict resolution (last change wins)
  - Consider locking products during stock count (Phase 2)
- **Owner**: Backend Team

### 11.4 Security Risks

**Risk S1: Unauthorized Access to App**
- **Severity**: High
- **Likelihood**: Low (Phase 1 has no auth)
- **Impact**: Competitors or unauthorized users access stock data
- **Mitigation**:
  - Implement authentication in Phase 2 (employee ID + PIN)
  - Disable public access to Edge Server (localhost only)
  - Encrypt local database
  - Implement session timeouts
- **Owner**: Security Team

**Risk S2: Data Breach via Lost Device**
- **Severity**: High
- **Likelihood**: Low
- **Impact**: Sensitive stock data exposed
- **Mitigation**:
  - Enable device encryption (iOS/Android settings)
  - Implement remote wipe capability (MDM)
  - Auto-logout after 4 hours inactivity
  - No PII stored on device
- **Owner**: Security Team + IT

**Risk S3: Malicious Data Injection**
- **Severity**: Medium
- **Likelihood**: Low
- **Impact**: Corrupt data in database
- **Mitigation**:
  - Strict input validation with Pydantic schemas
  - Sanitize all user inputs
  - Implement rate limiting on API endpoints
  - Monitor for anomalous data patterns
- **Owner**: Backend Team

### 11.5 Operational Risks

**Risk O1: Insufficient Staff Training**
- **Severity**: Medium
- **Likelihood**: Medium
- **Impact**: Misuse of app, data entry errors
- **Mitigation**:
  - Mandatory 10-minute training for all staff
  - Create video tutorials (< 2 minutes each)
  - Provide in-app onboarding on first launch
  - Assign app champions per department
- **Owner**: Training Team

**Risk O2: Lack of Support Resources**
- **Severity**: Medium
- **Likelihood**: Medium
- **Impact**: Staff can't resolve issues, abandon app
- **Mitigation**:
  - Create internal support Slack channel
  - Designate IT point of contact per store
  - Build FAQ and troubleshooting guide
  - Implement in-app "Report Issue" button
- **Owner**: Support Team

**Risk O3: Inadequate Testing Before Launch**
- **Severity**: High
- **Likelihood**: Low
- **Impact**: Critical bugs in production, user frustration
- **Mitigation**:
  - Comprehensive testing plan (see Section 9)
  - Beta test with 10-20 staff for 2 weeks
  - Staged rollout (1 store → 3 stores → all stores)
  - Rollback plan if critical issues discovered
- **Owner**: QA Team + Product Manager

## 12. Open Questions

### 12.1 Decisions Needed

**Q1: Authentication Approach**
- **Question**: Should Phase 1 include basic authentication, or launch without auth?
- **Options**:
  - A) Launch without auth (faster MVP, security risk)
  - B) Implement simple PIN-based auth (delays launch 1 week, better security)
  - C) Full SSO integration with IKEA employee system (delays launch 1 month)
- **Impact**: Security, launch timeline
- **Decision Maker**: Product Manager + Security Team
- **Deadline**: Week of 2026-03-10

**Q2: Camera Scanning Implementation**
- **Question**: Which barcode scanning library should we use?
- **Options**:
  - A) @zxing/browser (open source, good browser support)
  - B) QuaggaJS (older, more limited format support)
  - C) Native device camera API + external service (Scandit, slower)
- **Impact**: Performance, device compatibility, cost
- **Decision Maker**: Frontend Team Lead
- **Deadline**: Week of 2026-03-17

**Q3: Pagination Strategy**
- **Question**: How should we handle 1000+ products?
- **Options**:
  - A) Client-side pagination (simple, all data loaded upfront)
  - B) Server-side pagination (complex, reduces initial load)
  - C) Infinite scroll (good UX, harder to test)
  - D) Virtual scrolling (best performance, higher complexity)
- **Impact**: Performance, UX, development time
- **Decision Maker**: Frontend Team + UX Designer
- **Deadline**: Week of 2026-03-24

**Q4: Multi-Store Architecture**
- **Question**: Should each store have a dedicated Edge Server, or shared?
- **Options**:
  - A) Dedicated Edge Server per store (isolated, higher cost)
  - B) Shared Edge Server for 5-10 stores (cost-effective, single point of failure)
  - C) Hybrid: Edge Server per store + regional failover (resilient, complex)
- **Impact**: Cost, reliability, scalability
- **Decision Maker**: Infrastructure Team + Finance
- **Deadline**: Week of 2026-03-31

**Q5: Image Storage Strategy**
- **Question**: Where should product images be stored?
- **Options**:
  - A) External CDN URLs (simple, requires internet)
  - B) Couchbase attachments (offline-capable, increases DB size)
  - C) Hybrid: CDN primary, attachments fallback (best UX, complex)
- **Impact**: Offline capability, storage costs, performance
- **Decision Maker**: Backend Team + Product Manager
- **Deadline**: Week of 2026-04-07

### 12.2 Assumptions to Validate

**Assumption A1: Staff Have Sufficient Device Access**
- **Assumption**: Each store has enough tablets (1 per 2-3 staff)
- **Validation Method**: Survey stores, count existing devices
- **Risk if Wrong**: Insufficient devices → low adoption
- **Owner**: Store Operations
- **Deadline**: Week of 2026-03-10

**Assumption A2: Warehouse WiFi Coverage is Adequate**
- **Assumption**: < 10% dead zones in warehouse
- **Validation Method**: WiFi site survey, test in multiple stores
- **Risk if Wrong**: Frequent offline periods, delayed sync
- **Owner**: Infrastructure Team
- **Deadline**: Week of 2026-03-17

**Assumption A3: Staff Scan Products at Shelf Location**
- **Assumption**: 80%+ of scans occur within 5 meters of product shelf
- **Validation Method**: Observe staff behavior, analyze scan patterns
- **Risk if Wrong**: BLE positioning feature unusable
- **Owner**: Product Manager + Store Operations
- **Deadline**: Week of 2026-03-24

**Assumption A4: Product Schema Stability**
- **Assumption**: Product schema won't change significantly in next 6 months
- **Validation Method**: Review with central inventory team
- **Risk if Wrong**: Schema migrations required, downtime
- **Owner**: Backend Team + Central IT
- **Deadline**: Week of 2026-03-10

**Assumption A5: Sub-100ms Query Performance is Achievable**
- **Assumption**: Couchbase Edge Server can deliver < 100ms response for 1000 products
- **Validation Method**: Load testing with production-scale data
- **Risk if Wrong**: Need to implement caching layer or pagination
- **Owner**: Performance Team
- **Deadline**: Week of 2026-03-17

**Assumption A6: Staff Can Learn App in < 5 Minutes**
- **Assumption**: App is intuitive enough for minimal training
- **Validation Method**: User testing with 10 staff, measure time to first successful scan
- **Risk if Wrong**: Need more extensive training program
- **Owner**: UX Designer + Training Team
- **Deadline**: Week of 2026-03-24

**Assumption A7: Sync Conflicts Will Be Rare**
- **Assumption**: < 1% of writes result in conflicts
- **Validation Method**: Pilot with 20 users for 2 weeks, monitor conflict rate
- **Risk if Wrong**: Need more sophisticated conflict resolution UI
- **Owner**: Backend Team
- **Deadline**: Week of 2026-03-31

**Assumption A8: 220 Products is Representative Sample**
- **Assumption**: Current dataset covers typical product categories and edge cases
- **Validation Method**: Review with store managers, compare to full catalog
- **Risk if Wrong**: Missing critical product types or data fields
- **Owner**: Data Team + Store Operations
- **Deadline**: Week of 2026-03-10

---

## Appendix A: Glossary

- **Couchbase Edge Server**: Lightweight database running on local device for offline data access
- **Sync Gateway**: Middleware synchronizing data between Edge Servers and central Couchbase Server
- **Article Number**: IKEA's unique product identifier in format XXX.XXX.XX (e.g., 123.456.78)
- **Offline-First**: Architecture prioritizing local data access, syncing to backend when available
- **Revision (_rev)**: Couchbase's version identifier for conflict resolution (e.g., "1-abc123")
- **Pending Sync**: State where local changes exist but haven't synced to backend yet
- **Stale Data**: Locally cached data that hasn't synced recently (> 10 minutes)
- **Last-Write-Wins**: Conflict resolution strategy where most recent update prevails

## Appendix B: Related Documents

- `/Users/fredrik/claudeeverything/hackathon-ikea/worktree-offline-first/PLAN.md` - Project Plan
- `/Users/fredrik/claudeeverything/hackathon-ikea/worktree-offline-first/polytope.yml` - Infrastructure Configuration
- `/Users/fredrik/claudeeverything/hackathon-ikea/worktree-offline-first/models/python/models/entities/product.py` - Product Data Model
- `/Users/fredrik/claudeeverything/hackathon-ikea/worktree-offline-first/services/react-web-app/app/types/product.ts` - TypeScript Product Interface
- `/Users/fredrik/claudeeverything/hackathon-ikea/worktree-offline-first/scripts/data/products.json` - Sample Product Dataset (220 items)

## Appendix C: Revision History

| Version | Date       | Author          | Changes                                  |
|---------|------------|-----------------|------------------------------------------|
| 1.0     | 2026-03-03 | Claude Code     | Initial comprehensive analysis document   |

---

**Document Status**: Draft
**Next Review Date**: 2026-03-10
**Document Owner**: Product Manager, IKEA Staff Product Finder
**Last Updated**: 2026-03-03

# Multi-Floor Navigation Visual Guide

## Store Structure (Side View)

```
┌─────────────────────────────────────────────────────────────────┐
│                        FLOOR 3: WAREHOUSE                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  🏭 Self-Serve Warehouse                                 │   │
│  │  Aisles: 21 22 23 24 25 26 27 28 29 30                  │   │
│  │  [▓][▓][▓][▓][▓][▓][▓][▓][▓][▓]                         │   │
│  └──────────────────────────────────────────────────────────┘   │
│         ↕️ Escalator    🛗 Elevator    🪜 Stairs                 │
└─────────────────────────────────────────────────────────────────┘
                              ⬍
┌─────────────────────────────────────────────────────────────────┐
│                     FLOOR 2: MARKET HALL                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  🏪 Market Hall                                          │   │
│  │  Textiles | Cookshop | Lighting | Organization | Plants │   │
│  │    🛏️        🍳         💡          📦           🌿      │   │
│  └──────────────────────────────────────────────────────────┘   │
│         ↕️ Escalator    🛗 Elevator    🪜 Stairs                 │
└─────────────────────────────────────────────────────────────────┘
                              ⬍
┌─────────────────────────────────────────────────────────────────┐
│                   FLOOR 1: ENTRANCE & SHOWROOM                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  🏠 Showroom                                             │   │
│  │  Living | Bedroom | Kitchen | Dining | Children's       │   │
│  │   🛋️      🛏️        🍽️       🪑        🧸              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  🚪 ENTRANCE ──────────────────────────────── 💳 CHECKOUT → EXIT│
└─────────────────────────────────────────────────────────────────┘
```

## Vertical Transition Locations

```
                    FLOOR 3 (Warehouse)
                    ┌─────────────────┐
                    │   Entrance      │
                    │     Area        │
                    │  ↕️  🛗  🪜     │
                    └─────────────────┘
                           ↓↑
                    ┌─────────────────┐
                    │   FLOOR 2       │
                    │  (Market Hall)  │
                    │  ↕️  🛗  🪜     │
                    └─────────────────┘
                           ↓↑
                    ┌─────────────────┐
                    │   FLOOR 1       │
                    │  (Showroom)     │
                    │  ↕️  🛗  🪜     │
                    └─────────────────┘

Legend:
↕️ = Escalator (up/down separate)
🛗 = Elevator (all floors, bidirectional)
🪜 = Stairs (bidirectional)
```

## Transition Speed Comparison

```
┌────────────┬───────────┬─────────────┬────────────────┐
│   Type     │   Speed   │  Direction  │  Accessibility │
├────────────┼───────────┼─────────────┼────────────────┤
│ Escalator  │   FAST    │  One-Way    │       ❌       │
│            │  (15)     │             │                │
├────────────┼───────────┼─────────────┼────────────────┤
│   Stairs   │  MEDIUM   │ Both Ways   │       ❌       │
│            │  (20)     │             │                │
├────────────┼───────────┼─────────────┼────────────────┤
│  Elevator  │   SLOW    │ Both Ways   │       ✅       │
│            │  (30)     │  All Floors │   (Required)   │
└────────────┴───────────┴─────────────┴────────────────┘
```

## Example Route Visualization

### Route: Entrance (Floor 1) → Warehouse Aisle 25 (Floor 3)

#### Normal Mode (Fastest Route)
```
Floor 1: 🚪 Entrance
    ↓
Floor 1: 📍 Transition Hub
    ↓ ↕️ ESCALATOR UP (15 units)
Floor 2: 📍 Floor 2 Entrance
    ↓
Floor 2: 📍 Transition Hub
    ↓ ↕️ ESCALATOR UP (15 units)
Floor 3: 📍 Warehouse Entrance
    ↓
Floor 3: 🎯 Aisle 25

Total: ~80 units
Transitions: 2 escalators
```

#### Accessibility Mode (Elevator Only)
```
Floor 1: 🚪 Entrance
    ↓
Floor 1: 📍 Transition Hub
    ↓ 🛗 ELEVATOR (30 units)
Floor 3: 📍 Warehouse Entrance
    ↓
Floor 3: 🎯 Aisle 25

Total: ~95 units
Transitions: 1 elevator (skips Floor 2)
```

## Floor-by-Floor Direction Example

```
╔═══════════════════════════════════════════════════════════╗
║                    FLOOR 1: SHOWROOM                      ║
╚═══════════════════════════════════════════════════════════╝
  1. Start at Store Entrance (Floor 1)
  2. Head north to Entry Hall
  3. Head east to Floor 1 Transition Hub

     🔼 FLOOR TRANSITION

╔═══════════════════════════════════════════════════════════╗
║                   FLOOR 2: MARKET HALL                    ║
╚═══════════════════════════════════════════════════════════╝
  4. Take escalator up to Floor 2 (Market Hall)
  5. Head east to Floor 2 Transition Hub

     🔼 FLOOR TRANSITION

╔═══════════════════════════════════════════════════════════╗
║                   FLOOR 3: WAREHOUSE                      ║
╚═══════════════════════════════════════════════════════════╝
  6. Take escalator up to Floor 3 (Warehouse)
  7. Head south to Warehouse Entrance
  8. Head east to Aisle 25
  9. Arrive at Aisle 25
```

## Node Type Visual Guide

```
┌─────────────────────────────────────────────────────────┐
│  NODE TYPES                                             │
├─────────────────────────────────────────────────────────┤
│  🚪  entrance        - Main store entrance              │
│  🏪  aisle           - Shopping aisle or zone           │
│  ➕  junction        - Pathway intersection             │
│  ⬆️  escalator_up    - Escalator going up               │
│  ⬇️  escalator_down  - Escalator going down             │
│  🛗  elevator        - Elevator node                    │
│  🪜  stairs          - Staircase                        │
│  🚶  exit            - Store exit                       │
└─────────────────────────────────────────────────────────┘
```

## Edge Type Visual Guide

```
┌─────────────────────────────────────────────────────────┐
│  EDGE TYPES (Movement)                                  │
├─────────────────────────────────────────────────────────┤
│  🚶 walk      - Normal horizontal walking              │
│  ↕️  escalator - Escalator movement (one-way)           │
│  🛗 elevator  - Elevator movement (bidirectional)       │
│  🪜 stairs    - Staircase movement (bidirectional)      │
└─────────────────────────────────────────────────────────┘
```

## Graph Structure Visualization

```
                        FLOOR 3
    ┌────────────────────────────────────────┐
    │  warehouse-aisle-21 ─── warehouse-aisle-22
    │       │                       │
    │  warehouse-aisle-23 ─── warehouse-aisle-24
    │       │                       │
    │  warehouse-aisle-25 ... warehouse-aisle-30
    │       │                       │
    │  floor3-entrance ──────────────┘
    └──────────┬─────────────────────┘
               │
        escalator/elevator/stairs
               │
               ↓
                        FLOOR 2
    ┌────────────────────────────────────────┐
    │  textiles-1 ─── cookshop-1 ─── organization-1
    │       │              │              │
    │  lighting-1 ─── plants-1 ──────────┘
    │       │              │
    │  floor2-entrance ───┘
    │       │
    │  floor2-transition
    └──────────┬─────────────────────┘
               │
        escalator/elevator/stairs
               │
               ↓
                        FLOOR 1
    ┌────────────────────────────────────────┐
    │  entrance ─── entrance-hall ─── showroom-start
    │                                     │
    │  living-room-1 ─── living-room-2 ──┘
    │       │                  │
    │  bedroom-1 ─── bedroom-2 ─── childrens-1
    │       │                           │
    │  kitchen-1 ───────────────────────┘
    │       │                           │
    │  checkout                 floor1-transition
    │       │
    │  exit
    └──────────────────────────────────────────┘
```

## Accessibility Mode Decision Tree

```
                    Start Navigation
                         │
                         ▼
            ┌───────────────────────────┐
            │ Accessibility Mode ON?    │
            └─────┬─────────────────┬───┘
                  │                 │
                 YES               NO
                  │                 │
                  ▼                 ▼
        ┌─────────────────┐   ┌─────────────────┐
        │ Use ONLY        │   │ Use ALL         │
        │ Elevators       │   │ - Escalators    │
        │                 │   │ - Elevators     │
        │ ✅ Accessible   │   │ - Stairs        │
        │ ❌ Slower       │   │                 │
        │                 │   │ ✅ Faster       │
        └─────────────────┘   └─────────────────┘
```

## Route Optimization Flow

```
    User Request: Navigate to Product
             │
             ▼
    ┌─────────────────────────┐
    │ Calculate A* Path       │
    │ - Include floor penalty │
    │ - Filter by access mode │
    └───────────┬─────────────┘
                │
                ▼
    ┌─────────────────────────┐
    │ Find Vertical           │
    │ Transitions             │
    │ - Prefer escalators     │
    │ - Use elevator if needed│
    └───────────┬─────────────┘
                │
                ▼
    ┌─────────────────────────┐
    │ Generate Floor-Aware    │
    │ Directions              │
    │ - Group by floor        │
    │ - Add transition notes  │
    └───────────┬─────────────┘
                │
                ▼
         Return PathResult
```

## Weight Comparison Chart

```
Weight (Lower = Faster)

 0  ────────────────────────────────────────────
10  ────────────────────────────────────────────
    ║ Escalator (15)
15  ║═══════════════
    ║
20  ║══════════════════════
    ║ Stairs (20)
    ║
30  ║══════════════════════════════
    ║ Elevator (30)
    ║
40  ────────────────────────────────────────────
```

## Example Floor Transitions

### Scenario 1: Going Up Two Floors (Normal Mode)
```
Floor 1 ───(escalator)──→ Floor 2 ───(escalator)──→ Floor 3
         15 units                    15 units

Total: 30 units, 2 transitions
```

### Scenario 2: Going Up Two Floors (Accessibility Mode)
```
Floor 1 ───(elevator)──→ Floor 3
         30 units

Total: 30 units, 1 transition (direct)
```

### Scenario 3: Going Down Two Floors (Normal Mode)
```
Floor 3 ───(escalator)──→ Floor 2 ───(escalator)──→ Floor 1
         15 units                    15 units

Total: 30 units, 2 transitions
```

## Integration Points

```
┌─────────────────────────────────────────────────────┐
│              React Component Layer                  │
│  ┌─────────────────────────────────────────────┐   │
│  │  useNavigation() Hook                       │   │
│  │  - State management                         │   │
│  │  - Options handling                         │   │
│  └─────────────────┬───────────────────────────┘   │
└────────────────────┼─────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│              Pathfinding Core                       │
│  ┌─────────────────────────────────────────────┐   │
│  │  buildStoreGraph()                          │   │
│  │  - 70+ nodes across 3 floors                │   │
│  │  - 120+ edges with transitions              │   │
│  └─────────────────┬───────────────────────────┘   │
│                    │                                │
│  ┌─────────────────▼───────────────────────────┐   │
│  │  findPath() - Enhanced A*                   │   │
│  │  - Multi-floor heuristic                    │   │
│  │  - Accessibility filtering                  │   │
│  └─────────────────┬───────────────────────────┘   │
└────────────────────┼─────────────────────────────────┘
                     │
                     ▼
              PathResult with
              floor-aware directions
```

This visual guide helps understand the multi-floor navigation system architecture and flow!

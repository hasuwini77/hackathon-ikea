# Developer Setup Guide

Welcome to the IKEA Staff Product Finder project! This guide will help you get the offline-first system running locally.

## 1. Prerequisites

### Required Software

- **Node.js/Bun**: v18+ (for React app development)
  - Check: `bun --version` or `node --version`
  - Install: https://bun.sh (recommended) or https://nodejs.org

- **Python**: v3.7+ (for data generation and seeding)
  - Check: `python --version`
  - Install: https://www.python.org

- **Git**: For version control
  - Check: `git --version`

### System Requirements

- **macOS/Linux/Windows with WSL2**: Development works best on Unix-like systems
- **Disk Space**: ~2GB for dependencies and Couchbase data
- **RAM**: 4GB minimum, 8GB recommended

### Tools Used in This Project

- **Polytope**: Multi-service orchestration (configured in `polytope.yml`)
- **Couchbase Edge Server**: Local offline-first database
- **React Router v7**: Modern full-stack React framework
- **FastAPI**: Python backend API
- **Tailwind CSS**: Utility-first CSS framework

## 2. Quick Start (5 minutes)

### Step 1: Verify Prerequisites

```bash
# Check Node/Bun
bun --version  # or: node --version

# Check Python
python --version
```

### Step 2: Install Project Dependencies

```bash
# Navigate to React web app
cd /Users/fredrik/claudeeverything/hackathon-ikea/worktree-offline-first/services/react-web-app

# Install dependencies with Bun
bun install

# Or with npm
npm install
```

### Step 3: Generate Product Data

```bash
cd /Users/fredrik/claudeeverything/hackathon-ikea/worktree-offline-first

# Install Python dependencies
pip install -r scripts/requirements.txt

# Generate 220+ realistic IKEA products
python scripts/generate_products.py

# This creates: scripts/data/products.json
```

### Step 4: Start the Services

The full stack runs through Polytope, but for local development you can start components individually:

```bash
# Start React dev server (from react-web-app directory)
cd services/react-web-app
bun run dev

# Access the app at: http://localhost:5173/scan
```

For the complete offline-first system, the Couchbase Edge Server, Sync Gateway, and other services are managed by Polytope and configured in the `polytope.yml` file.

## 3. Project Structure

```
worktree-offline-first/
├── docs/                          # Documentation
│   ├── DEVELOPER_SETUP.md        # This file
│   ├── TASK_BREAKDOWN.md         # Task specifications
│   └── ANALYSIS_AND_REQUIREMENTS.md
├── services/                      # Application services
│   ├── react-web-app/            # Staff product finder UI
│   │   ├── app/                  # React Router app routes
│   │   ├── package.json
│   │   └── polytope.yml
│   ├── python-fast-api/          # Backend API (optional)
│   │   ├── src/
│   │   ├── polytope.yml
│   │   └── pyproject.toml
│   ├── couchbase-edge-server/    # Local offline database
│   │   ├── config.json           # Edge server configuration
│   │   ├── entrypoint.sh         # Startup script
│   │   └── polytope.yml
│   ├── sync-gateway/             # Sync between edge and main DB
│   │   ├── sync-gateway-config.json
│   │   └── polytope.yml
│   └── service-config-manager/   # Configuration management
├── scripts/                       # Data generation & seeding
│   ├── generate_products.py      # Create IKEA product dataset
│   ├── seed_couchbase.py         # Load products into Couchbase
│   ├── test_transformation.py    # Verify data transformations
│   ├── data/                     # Generated data
│   │   └── products.json
│   └── requirements.txt
├── models/                        # Business logic & data models
│   ├── python/                   # Python models
│   ├── typescript/               # TypeScript models
│   └── README.md
├── clients/                       # External service integrations
│   ├── python/                   # Python clients
│   ├── typescript/               # TypeScript clients
│   └── README.md
├── config/                        # Configuration files
├── polytope.yml                   # Main orchestration config
├── PLAN.md                        # Project mission and roadmap
└── README.md                      # Project overview
```

## 4. Running the Stack

### React Web App

The React app is the main user interface for staff product finding.

**Location**: `/Users/fredrik/claudeeverything/hackathon-ikea/worktree-offline-first/services/react-web-app/`

**Install dependencies**:
```bash
cd services/react-web-app
bun install
```

**Development server** (with hot reload):
```bash
bun run dev
```

**Access**: http://localhost:5173/scan

**Available scripts**:
- `bun run dev` - Start development server
- `bun run build` - Build for production
- `bun run typecheck` - Type checking with TypeScript

### Couchbase Edge Server

The Couchbase Edge Server provides local offline-first data storage.

**Location**: `/Users/fredrik/claudeeverything/hackathon-ikea/worktree-offline-first/services/couchbase-edge-server/`

**Configuration**:
- File: `services/couchbase-edge-server/config.json`
- API Endpoint: `http://127.0.0.1:59840`
- Main database: `main`

**Key Features**:
- Bidirectional sync with Sync Gateway
- Anonymous user access enabled
- Client-side reads and writes
- Continuous replication

**Starting the server**:
The server is managed by Polytope in `polytope.yml`. It starts automatically with the stack.

Manual startup (if needed):
```bash
cd services/couchbase-edge-server
./entrypoint.sh
```

### Seeding Data

Before using the app, load the IKEA product dataset into Couchbase.

**Step 1: Generate Products**

```bash
cd /Users/fredrik/claudeeverything/hackathon-ikea/worktree-offline-first

# Install Python dependencies (one-time)
pip install -r scripts/requirements.txt

# Generate 220+ IKEA products
python scripts/generate_products.py
```

This creates: `scripts/data/products.json` with realistic IKEA inventory including:
- 8 product categories (Living Room, Bedroom, Kitchen, Bathroom, Office, Outdoor, Kids, Storage)
- Authentic Swedish product names (KALLAX, MALM, BILLY, HELMER, etc.)
- Store locations with aisle, bay, and section numbers
- Pricing in SEK (Swedish Krona)
- Realistic dimensions, weights, colors, and availability

**Step 2: Seed Couchbase**

```bash
# Load products into Couchbase Edge Server
python scripts/seed_couchbase.py
```

This script:
- Connects to Couchbase at `http://127.0.0.1:59840`
- Creates the `ikea_products` database
- Inserts/updates all 220+ products
- Displays progress and statistics
- Shows sample products from each category

### Python FastAPI (Optional)

Optional backend API service for business logic.

**Location**: `/Users/Fredrik/claudeeverything/hackathon-ikea/worktree-offline-first/services/python-fast-api/`

**Features**:
- Health check endpoint: `GET /health`
- Hot reload enabled (changes auto-apply)
- Ready for PostgreSQL, Couchbase, Temporal, or Twilio integration

**Starting the API**:
Managed by Polytope automatically, or start manually:

```bash
cd services/python-fast-api
# The API runs on port 3030
# Check logs: __polytope__get_container_logs(container: python-fast-api, limit: 50)
```

**Check health**:
```bash
curl http://localhost:3030/health
```

### Sync Gateway

Handles synchronization between Couchbase Edge Server and main database.

**Location**: `/Users/fredrik/claudeeverything/hackathon-ikea/worktree-offline-first/services/sync-gateway/`

**Configuration**: `sync-gateway-config.json`

**Endpoint**: `ws://sync-gateway:4984/main` (internal)

The Sync Gateway manages:
- Bidirectional replication to Couchbase Edge Server
- User authentication and authorization
- Conflict resolution
- Continuous sync updates

## 5. Development Workflow

### Making Changes to the React App

1. **Navigate to app directory**:
   ```bash
   cd services/react-web-app
   ```

2. **Start dev server** (if not already running):
   ```bash
   bun run dev
   ```

3. **Edit files** in the `app/` directory - changes hot-reload automatically

4. **Check the browser** at http://localhost:5173/scan

### Testing Offline Mode

The offline-first architecture means the app works without internet:

1. **Start the app** with `bun run dev`
2. **Disable network** (in browser DevTools: Network tab → Offline)
3. **Verify data loads** from local Couchbase Edge Server
4. **Re-enable network** to test sync when connection returns

### Checking Sync Status

**Using Couchbase REST API**:
```bash
# Check Edge Server databases
curl http://127.0.0.1:59840/

# Check specific database
curl http://127.0.0.1:59840/main

# View all products
curl http://127.0.0.1:59840/main/_all_docs?include_docs=true

# Get specific product
curl http://127.0.0.1:59840/main/prod_0001
```

**Check replication status**:
```bash
# In Couchbase Edge Server, replications are defined in config.json
# Monitor logs for sync activity
```

## 6. Troubleshooting

### Issue: Port Already in Use

**Problem**: "Port 5173 already in use" or Couchbase port conflicts

**Solutions**:
```bash
# Find process using port 5173
lsof -i :5173

# Kill process
kill -9 <PID>

# Or use different port
bun run dev --host localhost --port 5174
```

### Issue: Couchbase Connection Error

**Problem**: "Failed to connect to Couchbase at http://127.0.0.1:59840"

**Solutions**:
```bash
# Verify Couchbase is running
curl http://127.0.0.1:59840

# Check if port is listening
lsof -i :59840

# Try restarting through Polytope or manually
cd services/couchbase-edge-server
./entrypoint.sh
```

### Issue: Products Not Appearing in App

**Problem**: App runs but no products are displayed

**Solutions**:

1. **Generate products first**:
   ```bash
   python scripts/generate_products.py
   ```

2. **Seed Couchbase**:
   ```bash
   python scripts/seed_couchbase.py
   ```

3. **Verify data in Couchbase**:
   ```bash
   curl http://127.0.0.1:59840/main/_all_docs | python -m json.tool
   ```

4. **Check browser console** for fetch/API errors

### Issue: Python Dependencies Not Found

**Problem**: "ModuleNotFoundError: No module named 'requests'"

**Solutions**:
```bash
# Install dependencies
pip install -r scripts/requirements.txt

# Or use virtual environment
python -m venv venv
source venv/bin/activate
pip install -r scripts/requirements.txt
```

### Issue: Bun/NPM Dependencies Failing

**Problem**: "Cannot find module" or build errors

**Solutions**:
```bash
cd services/react-web-app

# Clear cache and reinstall
rm -rf node_modules bun.lock
bun install

# Or with npm
npm ci
```

### Issue: Hot Reload Not Working

**Problem**: Changes don't reflect in browser

**Solutions**:
1. **Hard refresh**: Ctrl+Shift+R (or Cmd+Shift+R on Mac)
2. **Clear cache**: DevTools → Storage → Clear All
3. **Restart dev server**: Stop (Ctrl+C) and run `bun run dev` again

### Issue: TypeScript Errors

**Problem**: Type checking failures prevent build

**Solutions**:
```bash
cd services/react-web-app

# Run type check
bun run typecheck

# Fix errors or disable temporarily
# Edit tsconfig.json and relax rules
```

## 7. Useful Commands

### React App Commands

```bash
cd services/react-web-app

# Start development server
bun run dev

# Build for production
bun run build

# Start production server
bun run start

# Type checking
bun run typecheck

# List available scripts
bun run
```

### Python Scripting Commands

```bash
cd /Users/fredrik/claudeeverything/hackathon-ikea/worktree-offline-first

# Generate products dataset
python scripts/generate_products.py

# Seed Couchbase with products
python scripts/seed_couchbase.py

# Test data transformations
python scripts/test_transformation.py
```

### Couchbase API Commands

```bash
# Health check
curl http://127.0.0.1:59840

# Database info
curl http://127.0.0.1:59840/main

# List all products (limited to 20 per page)
curl http://127.0.0.1:59840/main/_all_docs?limit=20&include_docs=true

# List with pagination
curl "http://127.0.0.1:59840/main/_all_docs?startkey=\"prod_0050\"&limit=20&include_docs=true"

# Get specific product
curl http://127.0.0.1:59840/main/prod_0001

# Search by category (if indexed)
curl http://127.0.0.1:59840/main/_design/products/_view/by-category?key=\"Kitchen\"

# Get database statistics
curl http://127.0.0.1:59840/main/_stats
```

### Useful Utilities

```bash
# Format JSON responses nicely
curl http://127.0.0.1:59840/main | python -m json.tool

# Count products
curl http://127.0.0.1:59840/main/_all_docs | python -c "import sys, json; print(json.load(sys.stdin)['total_rows'])"

# View React app source maps
# (DevTools will automatically load them)
```

## 8. Next Steps After Setup

1. **Verify All Services Running**:
   - React app at http://localhost:5173/scan
   - Couchbase at http://127.0.0.1:59840
   - Optional: FastAPI at http://localhost:3030/health

2. **Test Basic Workflow**:
   - View product list in React app
   - Search for a product
   - Disable network and verify offline access
   - Re-enable network and confirm sync

3. **Explore the Codebase**:
   - Routes: `services/react-web-app/app/`
   - Models: `models/typescript/` and `models/python/`
   - API endpoints: `services/python-fast-api/src/`

4. **Review Documentation**:
   - `PLAN.md` - Project mission and roadmap
   - `docs/TASK_BREAKDOWN.md` - Implementation tasks
   - `services/react-web-app/README.md` - React app specifics
   - `services/python-fast-api/README.md` - API specifics

## 9. Development Tips

### Hot Reload is Your Friend

Both the React app and Python API have hot reload enabled. After saving changes:
- React: Changes appear immediately in browser (or after refresh)
- Python API: Changes auto-apply to running server

### Check Logs Often

For the FastAPI service managed by Polytope:
```bash
# View recent logs
__polytope__get_container_logs(container: python-fast-api, limit: 50)
```

### Use Browser DevTools

- **Network tab**: Monitor API calls and sync
- **Application/Storage**: View Couchbase sync state
- **Console**: Check for JavaScript errors
- **Performance**: Profile React rendering

### Data Flow

```
User Input
    ↓
React Component
    ↓
Couchbase Edge Server (local)
    ↓
[Sync Gateway] ← Network Available
    ↓
Main Couchbase (remote)
```

When offline, all reads/writes use the local Edge Server.

## 10. Getting Help

- Check **Troubleshooting** section (section 6) for common issues
- Review **logs** first: Always check DevTools console and server logs
- Read **existing documentation**:
  - `IMPLEMENTATION_SUMMARY.md`
  - `COUCHBASE_SEEDING_README.md`
  - Service-specific READMEs

## Quick Reference Checklist

- [ ] Node/Bun installed (`bun --version`)
- [ ] Python installed (`python --version`)
- [ ] Dependencies installed (`bun install` in react-web-app)
- [ ] Products generated (`python scripts/generate_products.py`)
- [ ] Products seeded (`python scripts/seed_couchbase.py`)
- [ ] React app running (`bun run dev`)
- [ ] Products visible at http://localhost:5173/scan
- [ ] Couchbase responding (`curl http://127.0.0.1:59840`)
- [ ] Offline mode testable (DevTools → Offline)

Welcome to the team! Happy coding.

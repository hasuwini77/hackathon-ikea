#!/bin/bash

# Script to verify test setup
# This script checks if all test files and configuration are in place

echo "🔍 Verifying test setup..."
echo ""

SUCCESS=0
FAIL=0

# Check vitest config
if [ -f "vitest.config.ts" ]; then
    echo "✅ vitest.config.ts found"
    SUCCESS=$((SUCCESS + 1))
else
    echo "❌ vitest.config.ts not found"
    FAIL=$((FAIL + 1))
fi

# Check test setup file
if [ -f "app/lib/couchbase/hooks/__tests__/setup.ts" ]; then
    echo "✅ Test setup file found"
    SUCCESS=$((SUCCESS + 1))
else
    echo "❌ Test setup file not found"
    FAIL=$((FAIL + 1))
fi

# Check test files
TEST_FILES=(
    "app/lib/couchbase/hooks/__tests__/useProducts.test.ts"
    "app/lib/couchbase/hooks/__tests__/useUpdateStock.test.ts"
    "app/lib/couchbase/hooks/__tests__/useSyncStatus.test.ts"
    "app/lib/couchbase/hooks/__tests__/useOfflineQueue.test.ts"
)

for file in "${TEST_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $(basename $file) found"
        SUCCESS=$((SUCCESS + 1))
    else
        echo "❌ $(basename $file) not found"
        FAIL=$((FAIL + 1))
    fi
done

# Check test README
if [ -f "app/lib/couchbase/hooks/__tests__/README.md" ]; then
    echo "✅ Test README found"
    SUCCESS=$((SUCCESS + 1))
else
    echo "❌ Test README not found"
    FAIL=$((FAIL + 1))
fi

# Check package.json for test scripts
if grep -q '"test":' package.json; then
    echo "✅ Test scripts found in package.json"
    SUCCESS=$((SUCCESS + 1))
else
    echo "❌ Test scripts not found in package.json"
    FAIL=$((FAIL + 1))
fi

# Check package.json for vitest dependency
if grep -q '"vitest":' package.json; then
    echo "✅ Vitest dependency found in package.json"
    SUCCESS=$((SUCCESS + 1))
else
    echo "❌ Vitest dependency not found in package.json"
    FAIL=$((FAIL + 1))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Results: $SUCCESS passed, $FAIL failed"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $FAIL -eq 0 ]; then
    echo "✅ Test setup is complete!"
    echo ""
    echo "Next steps:"
    echo "  1. Install dependencies: npm install (or bun install)"
    echo "  2. Run tests: npm run test"
    echo "  3. Check coverage: npm run test:coverage"
    echo ""
    exit 0
else
    echo "❌ Test setup is incomplete"
    echo ""
    echo "Please check the missing files above."
    echo ""
    exit 1
fi

#!/bin/bash
# Test script to verify stock update persistence

PRODUCT_ID="product:102.883.56"
BASE_URL="http://127.0.0.1:59840/ikea_products"

echo "==================================="
echo "Stock Update Persistence Test"
echo "==================================="
echo ""

# 1. Get current state
echo "1. Fetching current product state..."
CURRENT=$(curl -s "${BASE_URL}/${PRODUCT_ID}")
CURRENT_QTY=$(echo "$CURRENT" | jq -r '.stock.quantity')
CURRENT_REV=$(echo "$CURRENT" | jq -r '._rev')

echo "   Current quantity: $CURRENT_QTY"
echo "   Current revision: $CURRENT_REV"
echo ""

# 2. Calculate new quantity
NEW_QTY=$((CURRENT_QTY + 1))
echo "2. Updating stock to: $NEW_QTY"

# 3. Create updated document
UPDATED_DOC=$(echo "$CURRENT" | jq --arg qty "$NEW_QTY" --arg ts "$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")" '
  .stock.quantity = ($qty | tonumber) |
  .lastUpdated = $ts
')

# 4. Perform PUT request
echo "3. Sending PUT request..."
RESPONSE=$(curl -s -X PUT \
  -H "Content-Type: application/json" \
  "${BASE_URL}/${PRODUCT_ID}?rev=${CURRENT_REV}" \
  -d "$UPDATED_DOC")

NEW_REV=$(echo "$RESPONSE" | jq -r '.rev')
SUCCESS=$(echo "$RESPONSE" | jq -r '.ok')

if [ "$SUCCESS" = "true" ]; then
  echo "   ✓ Update successful"
  echo "   New revision: $NEW_REV"
else
  echo "   ✗ Update failed"
  echo "   Response: $RESPONSE"
  exit 1
fi
echo ""

# 5. Verify persistence
echo "4. Verifying persistence (fetching again)..."
sleep 0.5
VERIFY=$(curl -s "${BASE_URL}/${PRODUCT_ID}")
VERIFY_QTY=$(echo "$VERIFY" | jq -r '.stock.quantity')

echo "   Verified quantity: $VERIFY_QTY"
echo ""

# 6. Check result
if [ "$VERIFY_QTY" = "$NEW_QTY" ]; then
  echo "==================================="
  echo "✓ TEST PASSED"
  echo "Stock update persisted successfully!"
  echo "==================================="
  exit 0
else
  echo "==================================="
  echo "✗ TEST FAILED"
  echo "Expected: $NEW_QTY, Got: $VERIFY_QTY"
  echo "==================================="
  exit 1
fi

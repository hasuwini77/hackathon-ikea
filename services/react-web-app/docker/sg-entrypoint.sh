#!/bin/sh
set -e
set -x

echo "Waiting for Couchbase Server to be ready..."
until curl -s http://couchbase-server:8091/pools > /dev/null 2>&1; do
  echo "Couchbase Server not ready, retrying in 5s..."
  sleep 5
done
echo "Couchbase Server is ready."

POOLS_JSON="$(curl -sf http://couchbase-server:8091/pools || true)"
if echo "$POOLS_JSON" | grep -q '"pools":\[\]'; then
  echo "Couchbase cluster not initialized. Initializing cluster..."
  curl -v -X POST http://couchbase-server:8091/clusterInit \
    -d "hostname=couchbase-server.test" \
    -d "port=8091" \
    -d "username=${COUCHBASE_USERNAME}" \
    -d "password=${COUCHBASE_PASSWORD}" \
    -d "services=kv,index,n1ql" \
    -d "memoryQuota=512" \
    -d "indexMemoryQuota=256" \
    -d "afamily=ipv4"
  echo "Couchbase cluster initialized."
fi

# Initialize the bucket if it doesn't exist
echo "Ensuring bucket exists..."
curl -v -X POST http://couchbase-server:8091/pools/default/buckets \
  -u "${COUCHBASE_USERNAME}:${COUCHBASE_PASSWORD}" \
  -d "name=${COUCHBASE_BUCKET}" \
  -d "ramQuota=256" \
  -d "bucketType=couchbase" \
  || echo "Bucket creation failed or already exists"

echo "Waiting for bucket ${COUCHBASE_BUCKET} to be ready..."
until curl -sf -u "${COUCHBASE_USERNAME}:${COUCHBASE_PASSWORD}" http://couchbase-server:8091/pools/default/buckets/${COUCHBASE_BUCKET} > /dev/null 2>&1; do
  echo "Bucket not ready, retrying in 2s..."
  sleep 2
done
echo "Bucket is ready."

# Ensure GSI index storage mode is configured before Sync Gateway creates indexes
echo "Ensuring index storage mode is set..."
curl -sf -X POST http://couchbase-server:8091/settings/indexes \
  -u "${COUCHBASE_USERNAME}:${COUCHBASE_PASSWORD}" \
  -d "storageMode=plasma" \
  > /dev/null 2>&1 || echo "Index storage mode may already be configured"

DB_NAME="${COUCHBASE_BUCKET:-ikea_products}"
sleep 3

echo "Starting Sync Gateway..."
/entrypoint.sh /etc/sync_gateway/sync-gateway-config.json &
SG_PID=$!

echo "Waiting for Sync Gateway Admin API..."
until curl -sf http://127.0.0.1:4985/ > /dev/null 2>&1; do
  sleep 2
done

echo "Configuring Sync Gateway database: ${DB_NAME}"
HTTP_CODE=$(
  curl -s -o /tmp/sg-db-config-response.txt -w "%{http_code}" \
    -X PUT "http://127.0.0.1:4985/${DB_NAME}/" \
    -H "Content-Type: application/json" \
    -d @/etc/sync_gateway/database.json
)

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "409" ] || [ "$HTTP_CODE" = "412" ]; then
  echo "Database config applied (HTTP ${HTTP_CODE})."
else
  echo "Failed to configure database (HTTP ${HTTP_CODE})."
  cat /tmp/sg-db-config-response.txt || true
  kill "$SG_PID" || true
  exit 1
fi

wait "$SG_PID"

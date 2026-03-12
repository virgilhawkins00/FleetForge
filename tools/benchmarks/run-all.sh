#!/bin/bash

# FleetForge Benchmark Suite Runner
# Usage: ./run-all.sh [--duration 30] [--connections 50]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_URL="${BASE_URL:-http://localhost:3100}"
DURATION="${DURATION:-30}"
CONNECTIONS="${CONNECTIONS:-50}"
ITERATIONS="${ITERATIONS:-100}"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --duration)
      DURATION="$2"
      shift 2
      ;;
    --connections)
      CONNECTIONS="$2"
      shift 2
      ;;
    --iterations)
      ITERATIONS="$2"
      shift 2
      ;;
    --base-url)
      BASE_URL="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

echo "========================================"
echo "  FleetForge Performance Benchmark Suite"
echo "========================================"
echo ""
echo "Configuration:"
echo "  Base URL:    $BASE_URL"
echo "  Duration:    ${DURATION}s"
echo "  Connections: $CONNECTIONS"
echo "  Iterations:  $ITERATIONS"
echo ""

# Check if API is running
echo "Checking API availability..."
if ! curl -s "$BASE_URL/health" > /dev/null 2>&1; then
  echo "❌ API not available at $BASE_URL"
  echo "   Please start the API first: npm run start:dev"
  exit 1
fi
echo "✓ API is running"
echo ""

# Run endpoint latency benchmark
echo "========================================"
echo "  1. Endpoint Latency Benchmark"
echo "========================================"
ITERATIONS=$ITERATIONS BASE_URL=$BASE_URL node "$SCRIPT_DIR/endpoint-benchmark.js"
echo ""

# Run throughput benchmark
echo "========================================"
echo "  2. Throughput Benchmark"
echo "========================================"
DURATION=$DURATION CONNECTIONS=$CONNECTIONS BASE_URL=$BASE_URL node "$SCRIPT_DIR/throughput-benchmark.js"
echo ""

echo "========================================"
echo "  Benchmark Suite Complete"
echo "========================================"


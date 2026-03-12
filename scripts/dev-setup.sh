#!/bin/bash
# FleetForge Development Setup Script
# Works with Orbstack or Docker Desktop

set -e

echo "🚀 FleetForge Development Environment Setup"
echo "============================================"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check for docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Orbstack or Docker Desktop."
    exit 1
fi

echo -e "${BLUE}📦 Starting infrastructure services...${NC}"
docker compose -f docker-compose.dev.yml up -d

# Wait for services to be healthy
echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"
sleep 5

# Check MongoDB
echo -n "  MongoDB: "
if docker exec fleetforge-mongodb mongosh --eval "db.adminCommand('ping')" &> /dev/null; then
    echo -e "${GREEN}✓ Ready${NC}"
else
    echo "⏳ Starting..."
fi

# Check Redis
echo -n "  Redis: "
if docker exec fleetforge-redis redis-cli ping &> /dev/null; then
    echo -e "${GREEN}✓ Ready${NC}"
else
    echo "⏳ Starting..."
fi

# Check NATS
echo -n "  NATS: "
if curl -s http://localhost:8222/healthz &> /dev/null; then
    echo -e "${GREEN}✓ Ready${NC}"
else
    echo "⏳ Starting..."
fi

echo ""
echo -e "${GREEN}✅ Infrastructure is ready!${NC}"
echo ""
echo "📋 Connection Details:"
echo "  MongoDB:  mongodb://fleetforge:fleetforge123@localhost:27017/fleetforge?authSource=admin"
echo "  Redis:    redis://localhost:6379"
echo "  NATS:     nats://localhost:4222"
echo "  NATS UI:  http://localhost:8222"
echo ""
echo "🚀 Next steps:"
echo "  1. Start API:          npx nx serve api"
echo "  2. Start MQTT Gateway: npx nx serve mqtt-gateway"
echo "  3. Start Dashboard:    cd apps/dashboard && npm run dev"
echo "  4. Run Simulator:      cd tools/device-simulator && npx ts-node src/index.ts mqtt"
echo ""
echo -e "${BLUE}💡 To stop infrastructure: docker compose -f docker-compose.dev.yml down${NC}"


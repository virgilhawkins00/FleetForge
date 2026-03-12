#!/bin/bash
# FleetForge NPM Libraries Publishing Script
# Publishes all libraries to @fleetforgeio scope on NPM

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Libraries in dependency order
LIBS=(
  "core"
  "database"
  "security"
  "gcp-integration"
  "ai"
  "ota"
  "digital-twin"
)

echo -e "${BLUE}🚀 FleetForge NPM Publishing Script${NC}"
echo ""

# Check npm authentication
echo -e "${YELLOW}Checking NPM authentication...${NC}"
if ! npm whoami > /dev/null 2>&1; then
  echo -e "${RED}❌ Not logged in to NPM. Please run: npm login${NC}"
  exit 1
fi

NPM_USER=$(npm whoami)
echo -e "${GREEN}✅ Logged in as: $NPM_USER${NC}"

# Build all projects
echo ""
echo -e "${YELLOW}Building all projects...${NC}"
cd "$ROOT_DIR"
npm run build

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Build failed!${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Build successful${NC}"

# Update package.json files in dist to use @fleetforgeio scope
echo ""
echo -e "${YELLOW}Updating package names to @fleetforgeio scope...${NC}"
for lib in "${LIBS[@]}"; do
  if [ -f "dist/libs/$lib/package.json" ]; then
    sed -i '' 's/"name": "@fleetforge\//"name": "@fleetforgeio\//g' "dist/libs/$lib/package.json"
    sed -i '' 's/"@fleetforge\//"@fleetforgeio\//g' "dist/libs/$lib/package.json"
    echo -e "  ${GREEN}✓${NC} $lib"
  else
    echo -e "  ${YELLOW}⚠${NC} dist/libs/$lib/package.json not found"
  fi
done

# Publish each library
echo ""
echo -e "${YELLOW}Publishing libraries to NPM...${NC}"

PUBLISHED=0
FAILED=0

for lib in "${LIBS[@]}"; do
  LIB_PATH="dist/libs/$lib"
  
  if [ ! -d "$LIB_PATH" ]; then
    echo -e "  ${YELLOW}⚠${NC} Skipping $lib (not built)"
    continue
  fi
  
  echo -e "  ${BLUE}📦${NC} Publishing @fleetforgeio/$lib..."
  
  cd "$ROOT_DIR/$LIB_PATH"
  
  if npm publish --access public 2>&1 | grep -q "npm notice"; then
    echo -e "  ${GREEN}✅${NC} @fleetforgeio/$lib published successfully"
    ((PUBLISHED++))
  else
    RESULT=$(npm publish --access public 2>&1)
    if echo "$RESULT" | grep -q "EPUBLISHCONFLICT\|already been published"; then
      echo -e "  ${YELLOW}⚠${NC} @fleetforgeio/$lib already published (skipping)"
    else
      echo -e "  ${RED}❌${NC} Failed to publish @fleetforgeio/$lib"
      echo "$RESULT"
      ((FAILED++))
    fi
  fi
done

cd "$ROOT_DIR"

# Summary
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Published: $PUBLISHED${NC}"
if [ $FAILED -gt 0 ]; then
  echo -e "${RED}❌ Failed: $FAILED${NC}"
fi
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "Published packages:"
for lib in "${LIBS[@]}"; do
  echo -e "  ${GREEN}•${NC} https://www.npmjs.com/package/@fleetforgeio/$lib"
done


# FleetForge MQTT Gateway Dockerfile
# Multi-stage build for optimized image size

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (better caching)
COPY package*.json ./
COPY nx.json tsconfig*.json ./
RUN npm ci --legacy-peer-deps

# Copy source code
COPY libs/ ./libs/
COPY apps/mqtt-gateway/ ./apps/mqtt-gateway/

# Build the MQTT Gateway
RUN npx nx build mqtt-gateway --configuration=production

# Stage 2: Production
FROM node:20-alpine AS production

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --legacy-peer-deps --omit=dev && npm cache clean --force

# Copy built application
COPY --from=builder /app/dist/apps/mqtt-gateway ./dist

# Create non-root user
RUN addgroup -g 1001 -S fleetforge && \
    adduser -S fleetforge -u 1001 -G fleetforge
USER fleetforge

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3200/health || exit 1

# Expose MQTT and HTTP ports
EXPOSE 1883 3200

CMD ["node", "dist/main.js"]


# FleetForge API Dockerfile
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
COPY apps/api/ ./apps/api/

# Build the API
RUN npx nx build api --configuration=production

# Stage 2: Production
FROM node:20-alpine AS production

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --legacy-peer-deps --omit=dev && npm cache clean --force

# Copy built application
COPY --from=builder /app/dist/apps/api ./dist

# Create non-root user
RUN addgroup -g 1001 -S fleetforge && \
    adduser -S fleetforge -u 1001 -G fleetforge
USER fleetforge

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3100/health || exit 1

EXPOSE 3100

CMD ["node", "dist/main.js"]


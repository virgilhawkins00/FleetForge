# FleetForge Postman Collection

Complete API collection for testing and exploring the FleetForge IoT Fleet Management Platform.

## Files

- `FleetForge-API.postman_collection.json` - Complete API collection
- `FleetForge-Local.postman_environment.json` - Local development environment

## Importing

1. Open Postman
2. Click **Import** button
3. Drag and drop both JSON files
4. Select the "FleetForge Local" environment from the dropdown

## Collections Included

### 🔐 Auth
- Register new user
- Login (auto-saves tokens)
- Refresh token
- Get profile

### 📱 Devices
- List devices (with pagination)
- Create device (auto-saves device_id)
- Get device by ID
- Update device
- Delete device

### 🏢 Fleets
- List fleets
- Create fleet (auto-saves fleet_id)
- Get fleet by ID
- Add device to fleet
- Delete fleet

### 🚀 Deployments
- List deployments
- Create deployment (auto-saves deployment_id)
- Get deployment status
- Pause deployment
- Resume deployment
- Rollback deployment

### 📊 Telemetry
- Send telemetry data
- Get device telemetry history

### ❤️ Health
- Liveness check
- Readiness check
- Detailed health
- Prometheus metrics

## Variables

| Variable | Description | Auto-set |
|----------|-------------|----------|
| `base_url` | API base URL | No |
| `access_token` | JWT token | Yes (on login) |
| `refresh_token` | Refresh token | Yes (on login) |
| `device_id` | Current device ID | Yes (on create) |
| `fleet_id` | Current fleet ID | Yes (on create) |
| `deployment_id` | Current deployment ID | Yes (on create) |

## Quick Start

1. Import collection and environment
2. Run **Auth > Register** to create a user
3. Run **Auth > Login** to get tokens (auto-saved)
4. Use other endpoints - authentication is automatic!

## Tips

- Collection variables are automatically updated via test scripts
- Use **Ctrl+Enter** to run requests quickly
- Check the **Tests** tab for auto-save scripts


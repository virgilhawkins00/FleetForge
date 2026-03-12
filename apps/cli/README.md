# @fleetforge/cli

Command-line interface for managing FleetForge IoT devices, fleets, and deployments.

## Installation

```bash
# Install globally
npm install -g @fleetforge/cli

# Or use npx
npx @fleetforge/cli
```

## Quick Start

```bash
# Login to FleetForge
fleetforge login

# List devices
fleetforge devices list

# Get device details
fleetforge devices get <device-id>

# Create a deployment
fleetforge deployments create --firmware v1.2.0 --fleet production
```

## Commands

### Authentication
```bash
fleetforge login              # Interactive login
fleetforge login --token      # Login with API token
fleetforge logout             # Clear credentials
fleetforge whoami             # Show current user
```

### Devices
```bash
fleetforge devices list               # List all devices
fleetforge devices get <id>           # Get device details
fleetforge devices create --name <n>  # Register new device
fleetforge devices delete <id>        # Remove device
fleetforge devices logs <id>          # Stream device logs
```

### Fleets
```bash
fleetforge fleets list               # List all fleets
fleetforge fleets get <id>           # Get fleet details
fleetforge fleets create --name <n>  # Create fleet
fleetforge fleets add-device <f> <d> # Add device to fleet
```

### Deployments
```bash
fleetforge deployments list                     # List deployments
fleetforge deployments create --firmware <v>    # Create deployment
fleetforge deployments status <id>              # Check status
fleetforge deployments rollback <id>            # Rollback deployment
```

### Firmware
```bash
fleetforge firmware list                        # List firmware versions
fleetforge firmware upload <file>               # Upload new firmware
fleetforge firmware download <version>          # Download firmware
```

## Configuration

Configuration is stored in `~/.fleetforge/config.json`:

```json
{
  "apiUrl": "https://api.fleetforge.io",
  "token": "your-api-token",
  "defaultFleet": "production"
}
```

Environment variables:
- `FLEETFORGE_API_URL` - API endpoint
- `FLEETFORGE_TOKEN` - API token
- `FLEETFORGE_FLEET` - Default fleet

## Development

```bash
# Build
nx build cli

# Run locally
node dist/apps/cli/main.js devices list

# Test
nx test cli
```


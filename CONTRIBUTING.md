# Contributing to FleetForge

Thank you for your interest in contributing to FleetForge! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for all contributors.

## Getting Started

1. **Fork the repository**
2. **Clone your fork**:
   ```bash
   git clone https://github.com/yourusername/FleetForge.git
   cd FleetForge
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Create a branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Workflow

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:cov

# Run tests for specific library
nx test core

# Watch mode
nx test core --watch
```

### Code Quality

```bash
# Lint code
npm run lint

# Format code
npm run format

# Type check
npx tsc --noEmit
```

### Building

```bash
# Build all projects
npm run build

# Build specific library
nx build core
```

## Coding Standards

### TypeScript

- Use **strict mode** TypeScript
- Prefer **interfaces** over types for public APIs
- Use **PascalCase** for classes and interfaces
- Use **camelCase** for functions and variables
- Prefix interfaces with `I` (e.g., `IDeviceRepository`)

### Testing

- Maintain **80%+ code coverage**
- Write unit tests for all business logic
- Use descriptive test names: `should [expected behavior] when [condition]`
- Follow AAA pattern: Arrange, Act, Assert

### Commits

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add delta update support
fix: resolve memory leak in telemetry processor
docs: update OTA documentation
test: add tests for deployment entity
refactor: simplify device repository
```

### Pull Requests

1. **Update tests** for your changes
2. **Update documentation** if needed
3. **Ensure all tests pass**: `npm test`
4. **Ensure linting passes**: `npm run lint`
5. **Write a clear PR description** explaining the changes

## Project Structure

```
FleetForge/
├── apps/           # Microservices applications
├── libs/           # Reusable libraries
├── tools/          # Build and deployment scripts
└── .github/        # GitHub Actions workflows
```

## Adding a New Library

```bash
# Generate new library
nx generate @nx/nest:library my-library --directory=libs/my-library

# Add to tsconfig.base.json paths
# Add to tools/scripts/publish-libs.js
```

## Questions?

- Open an issue for bugs or feature requests
- Start a discussion for questions or ideas

## License

By contributing, you agree that your contributions will be licensed under the MIT License.


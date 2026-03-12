const { composePlugins, withNx } = require('@nx/webpack');
const path = require('path');

module.exports = composePlugins(withNx(), (config) => {
  const rootPath = path.resolve(__dirname, '../..');

  // Ensure all @fleetforge/* packages are bundled from source
  config.resolve = config.resolve || {};
  config.resolve.alias = {
    ...config.resolve.alias,
    '@fleetforge/core': path.resolve(rootPath, 'libs/core/src/index.ts'),
    '@fleetforge/database': path.resolve(rootPath, 'libs/database/src/index.ts'),
    '@fleetforge/security': path.resolve(rootPath, 'libs/security/src/index.ts'),
    '@fleetforge/gcp-integration': path.resolve(rootPath, 'libs/gcp-integration/src/index.ts'),
    '@fleetforge/ai': path.resolve(rootPath, 'libs/ai/src/index.ts'),
    '@fleetforge/ota': path.resolve(rootPath, 'libs/ota/src/index.ts'),
    '@fleetforge/digital-twin': path.resolve(rootPath, 'libs/digital-twin/src/index.ts'),
  };

  // Don't externalize our internal packages
  if (config.externals) {
    const origExternals = config.externals;
    config.externals = (ctx, callback) => {
      if (ctx.request && ctx.request.startsWith('@fleetforge/')) {
        return callback();
      }
      if (typeof origExternals === 'function') {
        return origExternals(ctx, callback);
      }
      if (Array.isArray(origExternals)) {
        for (const ext of origExternals) {
          if (typeof ext === 'function') {
            return ext(ctx, callback);
          }
        }
      }
      return callback();
    };
  }

  return config;
});

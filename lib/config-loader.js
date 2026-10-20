const fs = require('fs');
const path = require('path');

const config = {
  JWT_SECRET: process.env.JWT_SECRET || 'bff-super-secret',
  USER_SERVICE_URL: process.env.USER_SERVICE_URL || 'http://user-service:3001',
  ORDER_SERVICE_URL: process.env.ORDER_SERVICE_URL || 'http://order-service:3002',
  DASHBOARD_CACHE_TTL_MS: parseInt(process.env.DASHBOARD_CACHE_TTL_MS || '5000', 10),
  CIRCUIT_BREAKER_FAILURE_THRESHOLD: parseInt(process.env.CIRCUIT_BREAKER_FAILURE_THRESHOLD || '3', 10),
};

const CONFIG_MOUNT = process.env.CONFIG_MOUNT_PATH;

// Hot-reload is OPTIONAL — only activates if CONFIG_MOUNT_PATH is set
if (CONFIG_MOUNT && fs.existsSync(CONFIG_MOUNT)) {
  fs.watch(CONFIG_MOUNT, { persistent: false }, (event, filename) => {
    if (event === 'rename' || filename === '..data' || filename === 'config.env') {
      try {
        const envFile = path.join(CONFIG_MOUNT, 'config.env');
        if (fs.existsSync(envFile)) {
          const lines = fs.readFileSync(envFile, 'utf-8').split('\n');
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            const eq = trimmed.indexOf('=');
            if (eq < 0) continue;
            const key = trimmed.slice(0, eq).trim();
            const val = trimmed.slice(eq + 1).trim();
            if (key in config) {
              const parsed = isNaN(Number(val)) ? val : Number(val);
              if (config[key] !== parsed) {
                console.log(`[config] hot-reload: ${key} ${config[key]} -> ${parsed}`);
                config[key] = parsed;
              }
            }
          }
        }
      } catch (err) {
        console.error('[config] reload error:', err.message);
      }
    }
  });
  console.log('[config] hot-reload active, watching:', CONFIG_MOUNT);
} else {
  console.log('[config] using boot-time config (set CONFIG_MOUNT_PATH for hot-reload)');
}

module.exports = config;

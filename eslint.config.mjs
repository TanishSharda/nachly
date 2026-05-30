import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const nextConfig = require('eslint-config-next');

// Prefer the core-web-vitals config if available, otherwise fall back to the package itself
let base = (nextConfig && nextConfig.configs && nextConfig.configs['core-web-vitals']) || nextConfig || {};

export default Array.isArray(base) ? base : [base];

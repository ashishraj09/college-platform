/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  // Set the workspace root to the frontend directory to avoid lockfile conflicts
  outputFileTracingRoot: path.join(__dirname),
  
  // Other recommended configurations
  reactStrictMode: true,
  
  // Remove standalone output for Vercel - Vercel handles this automatically
  // output: 'standalone',
};

module.exports = nextConfig;

/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  // Set the workspace root to the frontend directory to avoid lockfile conflicts
  outputFileTracingRoot: path.join(__dirname),
  
  // Other recommended configurations
  reactStrictMode: false,
  
  // Disable type checking and linting during build (handle separately in CI)
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  
  // Export as static HTML
  output: 'export',
  
  //  Disable image optimization for static export
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;

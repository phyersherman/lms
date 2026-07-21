/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Enable standalone output for Docker production builds
  output: 'standalone',
  async rewrites() {
    // Same-origin API: proxy /api/* to the backend. In production Traefik routes
    // /api at the edge so this rewrite is only hit in local dev.
    const backend = process.env.BACKEND_URL || 'http://localhost:4000'
    return [
      { source: '/api/:path*', destination: `${backend}/api/:path*` },
    ]
  },
}

module.exports = nextConfig

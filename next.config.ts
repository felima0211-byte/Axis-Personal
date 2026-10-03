import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: '/favicon.ico', destination: '/brand/icon-512.png' }]
  },
}

export default nextConfig

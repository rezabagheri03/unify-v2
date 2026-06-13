/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@unify/shared-types'],
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns'],
  },
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    return [
      { source: '/api/:path*', destination: `${apiUrl}/api/:path*` },
      { source: '/socket.io/:path*', destination: `${apiUrl}/socket.io/:path*` },
    ];
  },
  output: 'standalone',
};

module.exports = nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async rewrites() {
    const target = process.env.BACKEND_API_REWRITE_TARGET;
    if (!target) return [];

    const normalized = target.endsWith('/') ? target.slice(0, -1) : target;
    return [
      {
        source: '/api/:path*',
        destination: `${normalized}/:path*`,
      },
    ];
  },
};

export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async redirects() {
    return [
      { source: '/activity', destination: '/audit', permanent: true },
      { source: '/alerts', destination: '/audit', permanent: true },
      { source: '/landing', destination: '/', permanent: true },
    ];
  },
  async rewrites() {
    const target = process.env.BACKEND_API_REWRITE_TARGET;
    const normalized = target ? (target.endsWith('/') ? target.slice(0, -1) : target) : '';

    // beforeFiles rewrites run before filesystem (pages/public)
    // The /api/landing route handler is a Next.js API route, so beforeFiles rewrite
    // will match first, then Next.js resolves /api/landing internally.
    // The afterFiles /api/:path* rewrite only applies to paths NOT matched by Next.js routes.
    return {
      beforeFiles: [
        { source: '/', destination: '/api/landing' },
      ],
      afterFiles: target ? [
        { source: '/api/:path*', destination: `${normalized}/:path*` },
      ] : [],
    };
  },
};

export default nextConfig;

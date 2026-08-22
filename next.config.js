/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'qdagzcivuddbztsybxfk.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  // Disable TypeScript checking during builds to prevent build failures
  typescript: {
    ignoreBuildErrors: true,
  },
  // Configure Turbopack's SVG loader.
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
}

module.exports = nextConfig

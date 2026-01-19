import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  // Ensure Turbopack uses the correct workspace root.
  // Without this, Next may pick up an unrelated lockfile (e.g. C:\Users\<you>\package-lock.json)
  // and treat the wrong directory as the app root, leading to random 404s / missing routes.
  turbopack: {
    root: __dirname,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;

import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  reactStrictMode: false,
  serverExternalPackages: ['prisma','@prisma/client'],
  allowedDevOrigins: ['*'],
  headers: async () => [
    { source:'/_next/static/:path*', headers:[{key:'Cache-Control',value:'public, max-age=31536000, immutable'}] },
    { source:'/api/:path*', headers:[{key:'Cache-Control',value:'no-cache, no-store, must-revalidate'}] },
    { source:'/(.*)', headers:[{key:'Cache-Control',value:'public, max-age=0, must-revalidate'}] },
  ],
};
export default nextConfig;

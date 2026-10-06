import type { NextConfig } from 'next';

const GATEWAY = process.env.GATEWAY_URL || 'http://localhost:4000';

const nextConfig: NextConfig = {
   allowedDevOrigins: ['knox-nonobserving-epistemically.ngrok-free.dev'],
  // Allow base64 images for logo preview
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
  },
  // Microservice gateway: all /api/* calls go through the API gateway backend,
  // which routes to the individual services (auth, account, product, bill, staff).
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${GATEWAY}/api/:path*` }];
  },
};

export default nextConfig;
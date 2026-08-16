/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Prevents duplicate WebSocket handshakes during development
  poweredByHeader: false,
  compress: true,
  images: {
    unoptimized: true
  }
};

export default nextConfig;

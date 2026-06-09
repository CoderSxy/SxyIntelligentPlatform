/** @type {import('next').NextConfig} */
const gatewayPort = process.env.GATEWAY_API_PORT ?? "8023";

const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `http://127.0.0.1:${gatewayPort}/api/:path*`
      }
    ];
  }
};

export default nextConfig;

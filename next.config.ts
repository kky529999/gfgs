import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.16.141'],
  transpilePackages: ['jose'],
};

export default nextConfig;

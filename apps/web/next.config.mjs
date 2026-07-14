/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@jobpilot/core", "@jobpilot/config"],
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;

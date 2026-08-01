/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  serverExternalPackages: ['@aws-sdk/client-bedrock-runtime'],
  experimental: {
    serverComponentsExternalPackages: ['@aws-sdk/client-bedrock-runtime'],
  },
};

export default nextConfig;

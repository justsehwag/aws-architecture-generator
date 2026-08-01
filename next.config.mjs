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
    proxyTimeout: 300000,
  },
  // Increase serverless function timeout for API routes
  serverRuntimeConfig: {
    maxDuration: 300,
  },
};

export default nextConfig;

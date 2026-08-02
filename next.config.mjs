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
  experimental: {
    serverComponentsExternalPackages: ['@aws-sdk/client-bedrock-runtime'],
    proxyTimeout: 300000,
  },
  serverRuntimeConfig: {
    maxDuration: 300,
  },
};

export default nextConfig;

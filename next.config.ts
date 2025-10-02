import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      'bufferutil': 'commonjs bufferutil',
    });

    // Handle Tesseract.js worker files
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }

    // Copy Tesseract.js worker files
    config.module.rules.push({
      test: /\.worker\.js$/,
      use: {
        loader: 'file-loader',
        options: {
          publicPath: '/_next/static/workers/',
          outputPath: 'static/workers/',
        },
      },
    });

    return config;
  },
  serverExternalPackages: ['socket.io'],

  // Ensure proper handling of static files
  experimental: {
    esmExternals: false,
  },
};

export default nextConfig;
/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
        crypto: false,
        stream: false,
        http: false,
        https: false,
        zlib: false,
        assert: false,
        url: false,
        buffer: require.resolve('buffer/'),
        process: require.resolve('process/browser'),
      };
    }
    return config;
  },
};

module.exports = nextConfig; 
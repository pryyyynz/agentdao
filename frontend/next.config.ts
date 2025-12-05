import type { NextConfig } from "next";
const path = require('path');

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  
  // Exclude test files and problematic modules from bundling
  webpack: (config, { isServer, webpack }) => {
    // Fix magic-ext/oauth resolution
    config.resolve.alias = {
      ...config.resolve.alias,
      '@magic-ext/oauth': path.resolve(__dirname, './src/lib/magic-stub.ts'),
    };
    
    // Replace viem test decorators with stub
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /viem\/_esm\/clients\/decorators\/test\.js$/,
        path.resolve(__dirname, './src/lib/viem-test-stub.ts')
      )
    );
    
    // Add fallback for optional dependencies
    config.resolve.fallback = {
      ...config.resolve.fallback,
      'pino-pretty': false,
    };
    
    // Ignore test files and helper files in node_modules
    config.module = config.module || {};
    config.module.rules = config.module.rules || [];
    config.module.rules.push({
      test: /node_modules\/.*\/(test|__tests__|spec|__mocks__)\/.*\.(js|mjs|ts|tsx|md|sh|zip)$/,
      loader: 'ignore-loader'
    });
    
    // Exclude walletconnect test directories
    config.module.noParse = [
      /node_modules\/@walletconnect\/.*\/test\//,
      /node_modules\/thread-stream\/test\//,
      /node_modules\/pino\/test\//,
    ];
    
    return config;
  },
  
  // Transpile problematic packages
  transpilePackages: [
    '@walletconnect/web3wallet',
    '@walletconnect/auth-client',
    '@walletconnect/sign-client',
    '@walletconnect/universal-provider',
  ],
};

export default nextConfig;

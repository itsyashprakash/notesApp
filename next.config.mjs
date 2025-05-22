import withBundleAnalyzer from '@next/bundle-analyzer';

/** @type {import('next').NextConfig} */
let nextConfig = {
  // ESLint and TypeScript error checking are now re-enabled by removing the ignore flags.
};

if (process.env.ANALYZE === 'true') {
  nextConfig = withBundleAnalyzer({
    enabled: true,
  })(nextConfig);
}

export default nextConfig;

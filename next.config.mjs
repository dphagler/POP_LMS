// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { domains: ['i.ytimg.com'] },
  // safe to keep minimal experimental flags
  experimental: { serverActions: { bodySizeLimit: '2mb' } },
};
export default nextConfig;

const isDevelopment = process.env.NODE_ENV !== "production";


/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { domains: ["i.ytimg.com"] },
  env: {
    
  },
};

export default nextConfig;

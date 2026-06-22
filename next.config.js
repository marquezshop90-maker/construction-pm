/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for recharts 2.x to compile correctly with Next.js 15
  transpilePackages: ['recharts'],
}
module.exports = nextConfig

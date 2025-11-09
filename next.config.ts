import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  
};
module.exports = {
  async rewrites(){
    return[
      {
        source: '/api/:path*',
        destination: 'https://hackutd2025.eog.systems/api/:path*',
      },
    ];
  },
};
export default nextConfig;
 codex/build-modular-frontend-for-restaurant-pos-yluvnu

import withPWA from 'next-pwa';

 main
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    appDir: true
  }
};

 codex/build-modular-frontend-for-restaurant-pos-yluvnu
export default nextConfig;

export default withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development'
})(nextConfig);
 main

/** @type {import('next').NextConfig} */

const nextConfig = {
  images: {
    domains: ['localhost'], // Оставляем настройку для изображений
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*", // Любые запросы, начинающиеся с /api/
        destination: "http://localhost:5000/api/:path*", // Перенаправляем на бэкенд
      },
    ];
  },
};

export default nextConfig;

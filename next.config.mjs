/** @type {import('next').NextConfig} */
const nextConfig = {
  // Сайт раздаётся GitHub Pages — только статика, без сервера
  output: 'export',
  trailingSlash: true,
  images: {
    // оптимизатор картинок требует сервер, на статике он недоступен
    unoptimized: true,
  },
};

export default nextConfig;

const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack(config) {
    // Resuelve @content/* a la carpeta de contenidos fuera del app/
    config.resolve.alias["@content"] = path.resolve(__dirname, "../contenidos");
    return config;
  },
};

module.exports = nextConfig;

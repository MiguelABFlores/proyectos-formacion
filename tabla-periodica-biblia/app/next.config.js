const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Indica la raíz del monorepo para que Next.js no confunda lockfiles vecinos
  outputFileTracingRoot: path.join(__dirname, "../../"),
  webpack(config) {
    // Resuelve @content/* a la carpeta de contenidos fuera del app/
    config.resolve.alias["@content"] = path.resolve(__dirname, "../contenidos");
    return config;
  },
};

module.exports = nextConfig;

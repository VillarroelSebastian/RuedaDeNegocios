import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.56.1", "localhost"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "ui-avatars.com" },
      // Archivos subidos al backend local (localhost y cualquier IP de red local)
      { protocol: "http", hostname: "localhost", port: "3334", pathname: "/uploads/**" },
      { protocol: "http", hostname: "**", port: "3334", pathname: "/uploads/**" },
    ],
  },
};

export default nextConfig;

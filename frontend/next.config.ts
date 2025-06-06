import { mkdirSync } from "node:fs";
import { dirname } from "path";
import type { NextConfig } from "next";

mkdirSync(dirname(process.env.LOG_FILE_PATH || "/logs/frontend.log"), {
  recursive: true,
});

const nextConfig: NextConfig = {
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      issuer: {
        and: [/\.(js|ts)x?$/],
      },
      use: [
        {
          loader: "@svgr/webpack",
          options: {
            svgo: false, // 圧縮を無効にする設定
          },
        },
      ],
    });

    return config;
  },
  images: {
    disableStaticImages: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        port: "",
        pathname: "**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "",
        pathname: "**",
      },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;

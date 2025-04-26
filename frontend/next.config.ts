import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      issuer: {
        and: [/\.(js|ts)x?$/],
      },
      use: [
        {
          loader: '@svgr/webpack',
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
  },
};

export default nextConfig;

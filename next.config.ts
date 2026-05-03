import type { NextConfig } from "next";
import withPWA from "next-pwa";

const nextConfig: NextConfig = withPWA({
  dest: "public",
  customWorkerDir: "worker",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
})({
  reactStrictMode: true,
});

export default nextConfig;

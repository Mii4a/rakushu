import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["localhost", "127.0.0.1"],
  serverExternalPackages: ["@libsql/client", "@libsql/hrana-client", "@libsql/isomorphic-ws"]
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["bcryptjs"],
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  async redirects() {
    return [
      { source: "/postulante", destination: "/emprendedor", permanent: false },
      { source: "/postulante/:path*", destination: "/emprendedor/:path*", permanent: false },
      { source: "/ingresar/postulante", destination: "/ingresar/emprendedor", permanent: false },
    ];
  },
};

export default nextConfig;

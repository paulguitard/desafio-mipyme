import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["bcryptjs", "cloudinary"],
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  async redirects() {
    return [
      { source: "/emprendedor", destination: "/participante", permanent: false },
      { source: "/emprendedor/:path*", destination: "/participante/:path*", permanent: false },
      { source: "/ingresar/emprendedor", destination: "/ingresar/participante", permanent: false },
      { source: "/postulante", destination: "/participante", permanent: false },
      { source: "/postulante/:path*", destination: "/participante/:path*", permanent: false },
      { source: "/ingresar/postulante", destination: "/ingresar/participante", permanent: false },
    ];
  },
};

export default nextConfig;

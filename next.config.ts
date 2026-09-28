import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-src https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://drive.google.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["bcryptjs", "cloudinary"],
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    return [
      { source: "/emprendedor", destination: "/participante", permanent: false },
      { source: "/emprendedor/:path*", destination: "/participante/:path*", permanent: false },
      { source: "/ingresar/emprendedor", destination: "/ingresar/participante", permanent: false },
      { source: "/postulante", destination: "/participante", permanent: false },
      { source: "/postulante/:path*", destination: "/participante/:path*", permanent: false },
      { source: "/ingresar/postulante", destination: "/ingresar/participante", permanent: false },
      { source: "/admin/convocatorias", destination: "/admin/mentorias", permanent: false },
      { source: "/admin/convocatorias/:path*", destination: "/admin/mentorias/:path*", permanent: false },
    ];
  },
};

export default nextConfig;

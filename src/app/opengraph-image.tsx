import { ImageResponse } from "next/og";

export const alt = "Desafío MiPyme | Portal de Mentorías";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0a2156",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "#ffffff",
          fontFamily: "Georgia, 'Times New Roman', serif",
        }}
      >
        <div
          style={{
            width: 140,
            height: 140,
            border: "4px solid #ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 92,
            fontWeight: 800,
            marginBottom: 36,
          }}
        >
          D
        </div>
        <div style={{ fontSize: 56, fontWeight: 800, letterSpacing: -1 }}>
          Desafío MiPyme
        </div>
        <div style={{ fontSize: 28, marginTop: 12, opacity: 0.92 }}>
          Portal de Mentorías
        </div>
      </div>
    ),
    { ...size },
  );
}

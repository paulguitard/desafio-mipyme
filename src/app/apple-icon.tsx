import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0a2156",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#ffffff",
          fontSize: 118,
          fontWeight: 800,
          fontFamily: "Georgia, 'Times New Roman', serif",
          lineHeight: 1,
        }}
      >
        D
      </div>
    ),
    { ...size },
  );
}

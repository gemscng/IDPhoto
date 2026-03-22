import { ImageResponse } from "next/og";

export const alt = "IDPhoto — AI Interview Photos for Kids";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #3b82f6 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Decorative circles */}
        <div
          style={{
            position: "absolute",
            top: -80,
            right: -80,
            width: 300,
            height: 300,
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.08)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -60,
            left: -60,
            width: 240,
            height: 240,
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.06)",
            display: "flex",
          }}
        />

        {/* Logo badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 80,
            height: 80,
            borderRadius: 20,
            background: "rgba(255, 255, 255, 0.2)",
            marginBottom: 24,
            fontSize: 36,
            fontWeight: 800,
            color: "white",
            letterSpacing: -2,
          }}
        >
          ID
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            color: "white",
            letterSpacing: -2,
            lineHeight: 1,
            marginBottom: 16,
            display: "flex",
          }}
        >
          IDPhoto
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 28,
            color: "rgba(255, 255, 255, 0.85)",
            fontWeight: 400,
            letterSpacing: 0,
            display: "flex",
          }}
        >
          AI Interview Photos for Kids
        </div>

        {/* Location tag */}
        <div
          style={{
            fontSize: 18,
            color: "rgba(255, 255, 255, 0.6)",
            fontWeight: 400,
            marginTop: 12,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          Hong Kong
        </div>

        {/* Bottom bar */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 6,
            background: "rgba(255, 255, 255, 0.3)",
            display: "flex",
          }}
        />
      </div>
    ),
    {
      ...size,
    },
  );
}

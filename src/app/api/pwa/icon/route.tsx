import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const size = parseInt(searchParams.get("size") ?? "512");
  const maskable = searchParams.get("maskable") === "1";

  const padding = maskable ? size * 0.15 : size * 0.08;
  const iconSize = size - padding * 2;
  const fontSize = iconSize * 0.42;
  const borderRadius = maskable ? 0 : size * 0.22;

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: maskable
            ? "#2563eb"
            : "linear-gradient(135deg, #1e40af 0%, #2563eb 100%)",
          borderRadius,
        }}
      >
        <div
          style={{
            width: iconSize,
            height: iconSize,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(255,255,255,0.1)",
            borderRadius: iconSize * 0.2,
          }}
        >
          <span
            style={{
              color: "white",
              fontSize,
              fontWeight: 800,
              letterSpacing: "-2px",
              fontFamily: "sans-serif",
            }}
          >
            IT
          </span>
        </div>
      </div>
    ),
    { width: size, height: size }
  );
}

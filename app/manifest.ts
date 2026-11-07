import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/", name: "Lane's Lair", short_name: "Lane's Lair",
    description: "Capture a thought. Choose your next move.",
    start_url: "/", scope: "/", display: "standalone", lang: "en",
    background_color: "#111216", theme_color: "#111216",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [{ name: "Capture an idea", short_name: "Inbox", url: "/inbox" }],
  };
}

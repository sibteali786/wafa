import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Wafa",
    short_name: "Wafa",
    description: "A promise keeper.",
    start_url: "/",
    display: "standalone",
    background_color: "#fbf8f3",
    theme_color: "#2f7a6b",
    icons: [
      {
        src: "/brand/wafa-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/brand/wafa-icon.png",
        sizes: "192x192 512x512",
        type: "image/png",
      },
      {
        src: "/brand/wafa-icon-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
      {
        src: "/brand/wafa-icon-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/brand/wafa-icon-monochrome.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "monochrome",
      },
    ],
  };
}
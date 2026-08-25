import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RemindMeds",
    short_name: "RemindMeds",
    description:
      "Plan, track, and remember every medication dose with less effort.",
    start_url: "/",
    display: "standalone",
    background_color: "#FAFAF8",
    theme_color: "#0B8B57",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}

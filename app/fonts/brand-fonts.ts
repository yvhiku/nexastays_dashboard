import localFont from "next/font/local";

/** Self-hosted brand fonts — no Google Fonts download at build time. */
export const playfair = localFont({
  src: [
    {
      path: "./playfair-display-nuFiD-vYSZviVYUb_rj3ij__anPXDTLYgFE_.woff2",
      weight: "400 700",
      style: "normal",
    },
    {
      path: "./playfair-display-nuFiD-vYSZviVYUb_rj3ij__anPXDTzYgA.woff2",
      weight: "400 700",
      style: "normal",
    },
  ],
  variable: "--font-playfair",
  display: "swap",
  preload: true,
});

export const dmSans = localFont({
  src: [
    {
      path: "./dm-sans-rP2Yp2ywxg089UriI5-g4vlH9VoD8Cmcqbu6-K6h9Q.woff2",
      weight: "300 600",
      style: "normal",
    },
    {
      path: "./dm-sans-rP2Yp2ywxg089UriI5-g4vlH9VoD8Cmcqbu0-K4.woff2",
      weight: "300 600",
      style: "normal",
    },
  ],
  variable: "--font-dm-sans",
  display: "swap",
  preload: true,
});

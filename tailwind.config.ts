import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-playfair)", "Georgia", "serif"],
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
      },
      colors: {
        nexa: {
          primary: "#E8507A",
          "primary-dark": "#C93A62",
          "primary-light": "#F4809A",
          "primary-soft": "#FDF0F3",
          accent: "#F9A86C",
          "accent-soft": "#FEF5EC",
          ink: "#1A1118",
          "ink-2": "#3D2B36",
          "ink-3": "#6B5460",
          "ink-4": "#9E8A93",
          line: "#EDE0E5",
          bg: "#FDFBFC",
          "bg-2": "#F8F2F5",
          success: "#3DAA84",
          "success-soft": "#E9F6F1",
          warning: "#E3A008",
          "warning-soft": "#FDF6E3",
          danger: "#E0475B",
          "danger-soft": "#FCECEE",
          info: "#4A7FE0",
          "info-soft": "#EBF1FD",
        },
      },
      borderRadius: {
        sm: "8px",
        md: "14px",
        lg: "22px",
        xl: "32px",
      },
      boxShadow: {
        "nexa-sm": "0 2px 8px rgba(232,80,122,0.08)",
        "nexa-md": "0 6px 24px rgba(232,80,122,0.12)",
        "nexa-lg": "0 16px 48px rgba(232,80,122,0.16)",
        "nexa-card": "0 4px 20px rgba(26,17,24,0.07)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.3s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;

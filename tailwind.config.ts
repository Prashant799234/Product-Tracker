import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      colors: {
        surface: {
          DEFAULT: "#0b111e",
          1: "#181c22",
          2: "#202226",
          3: "#262a31",
        },
        brand: {
          orange: "#fe6a11",
          "orange-hover": "#ff7d2e",
          "orange-light": "#ff8235",
          "orange-alt": "#f27323",
          "orange-tint": "#ffc797",
          blue: "#22a3ff",
          "blue-dark": "#1b9ce4",
          "blue-muted": "#354b74",
          "blue-muted-2": "#374d71",
        },
        success: "#22a36b",
        critical: "#eb2027",
        text: {
          primary: "#ffffff",
          secondary: "#f4f4f4",
          muted: "#e5e7eb",
          faint: "#acacac",
          dim: "#6b7280",
          subtle: "#5b6474",
        },
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.375rem",
      },
    },
  },
  plugins: [],
};

export default config;

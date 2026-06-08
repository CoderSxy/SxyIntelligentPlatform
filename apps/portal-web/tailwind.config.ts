import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: "#f6f7f9",
        ink: "#1f2933",
        muted: "#64748b",
        brand: "#2563eb",
        accent: "#059669"
      }
    }
  },
  plugins: []
};

export default config;


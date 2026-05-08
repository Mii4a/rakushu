import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        rakushu: {
          50: "#f5f8ff",
          100: "#e8efff",
          500: "#5b74f1",
          700: "#3e54c7"
        },
        rakumo: {
          cream: "#FFFDF7",
          sand: "#FFF8EA",
          mint: "#7DD3C7",
          ink: "#2D3A4A",
          warning: "#FFD76A",
          peach: "#FFC7A3",
          lavender: "#B8B2E6",
          border: "#E5E7EB"
        }
      }
    }
  },
  plugins: []
};

export default config;

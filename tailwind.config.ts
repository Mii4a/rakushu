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
        }
      }
    }
  },
  plugins: []
};

export default config;

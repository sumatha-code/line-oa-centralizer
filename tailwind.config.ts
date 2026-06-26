import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        line: {
          DEFAULT: "#06C755",
          hover: "#05a948",
        },
        educ: {
          DEFAULT: "#002244",
          light: "#003366",
        },
        dark: {
          bg: "#141414",
          card: "#1f1f1f",
          border: "#303030",
        },
      },
    },
  },
  plugins: [],
};
export default config;

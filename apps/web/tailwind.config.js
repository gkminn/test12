/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0d1117",
        panel: "#0f1620",
        panel2: "#131b25",
        border: "#1f2a37",
        fg: "#e6edf3",
        muted: "#8b96a5",
        up: "#26a69a",
        down: "#ef5350",
        bull: "#ffa726",
        bear: "#26c6da",
        baseline: "#42a5f5",
        accent: "#66bb6a",
      },
      fontFamily: {
        sans: ["Pretendard", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};

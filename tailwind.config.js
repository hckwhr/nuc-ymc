/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#FAFAF7", // 米白底
        surface: "#FFFFFF",
        ink: "#1A1A1A",        // 近黑正文/标题
        soft: "#6F6F6F",       // 次要灰
        line: "#ECE9E1",       // 分隔线
        // 鲜艳但柔和的活力点缀色（青春不刺眼）
        coral: "#FF7A59",
        mint: "#10B981",
        sky: "#38BDF8",
        sun: "#FBBF24",
        violet: "#8B5CF6",
        rose: "#FB6F92",
        teal: "#14B8A6",
      },
      fontFamily: {
        display: ['"Instrument Serif"', '"Noto Serif SC"', '"Songti SC"', "SimSun", "serif"],
        sans: ['Inter', '"Noto Sans SC"', '"PingFang SC"', '"Microsoft YaHei"', "system-ui", "sans-serif"],
      },
      letterSpacing: {
        tightest: "-0.03em",
      },
      keyframes: {
        "fade-rise": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "spin-slow": { to: { transform: "rotate(360deg)" } },
        shimmer: { "100%": { transform: "translateX(100%)" } },
      },
      animation: {
        "fade-rise": "fade-rise 0.8s ease-out forwards",
        "fade-rise-delay": "fade-rise 0.8s ease-out 0.2s forwards",
        "fade-rise-delay-2": "fade-rise 0.8s ease-out 0.4s forwards",
        "fade-rise-delay-3": "fade-rise 0.8s ease-out 0.6s forwards",
        float: "float 6s ease-in-out infinite",
        "spin-slow": "spin-slow 22s linear infinite",
      },
    },
  },
  plugins: [],
};

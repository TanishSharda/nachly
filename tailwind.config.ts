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
        /* Naachly marketing-aligned palette (primary project tokens) */
        naachly: {
          background: "#0a0a0a",
          surface: "#141314",
          foreground: "#F8F5EF",
          muted: "#8A8D9F",
          accent: "#FFFFFF",
          accentPink: "#F3B2AB",
          accentPinkDark: "#D88B80",
        },
        /* compatibility aliases for existing code that reference older tokens */
        dbg: {
          DEFAULT: "#0a0a0a",
          50: "#282828",
          100: "#1a1a1a",
          200: "#121212",
          300: "#0a0a0a",
        },
        dark: {
          DEFAULT: "#0a0a0a",
          50: "#282828",
          100: "#1f1f1f",
          200: "#1a1a1a",
          300: "#8A8D9F",
        },
        /* keep `wine` as-is in case used elsewhere */
        wine: {
          50: "#fdf2f8",
          100: "#fce7f3",
          200: "#fbcfe8",
          300: "#f9a8d4",
          400: "#f472b6",
          500: "#ec4899",
          600: "#db2777",
          700: "#be185d",
          800: "#9d174d",
          900: "#831843",
        },
      },
      fontFamily: {
        display: ["var(--font-manrope)", "var(--font-playfair)", "Georgia", "serif"],
        body: ["var(--font-manrope)", "var(--font-inter)", "system-ui", "sans-serif"],
        dash: ["'Manrope'", "'Inter'", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "gradient-nred": "linear-gradient(135deg, #F3B2AB 0%, #D88B80 100%)",
        "gradient-warm": "linear-gradient(135deg, #F3B2AB 0%, #E6A39F 100%)",
        "gradient-wine": "linear-gradient(135deg, #F3B2AB 0%, #D88B80 100%)",
        "gradient-gold": "linear-gradient(135deg, #F3B2AB 0%, #FBEAEA 100%)",
        "gradient-cream": "linear-gradient(180deg, #061433 0%, #010713 100%)",
      },
      transitionTimingFunction: {
        "luxury-out": "cubic-bezier(0.23, 1, 0.32, 1)", // Ease-Out-Quint
        "standard": "cubic-bezier(0.4, 0, 0.2, 1)",
      },
      animation: {
        "fade-in": "fadeIn 0.8s cubic-bezier(0.23, 1, 0.32, 1)",
        "slide-up-fade": "slideUpFade 0.8s cubic-bezier(0.23, 1, 0.32, 1) forwards",
        "slow-scale": "slowScale 10s ease-in-out infinite alternate",
        "blur-to-clear": "blurToClear 1s ease-out forwards",
        "fade-in-basic": "fadeIn 0.6s ease-out",
        "slide-up": "slideUp 0.6s ease-out",
        "slide-down": "slideDown 0.3s ease-out",
        "scale-in": "scaleIn 0.3s ease-out",
        float: "float 6s ease-in-out infinite",
        "pulse-slow": "pulse 3s ease-in-out infinite",
        shimmer: "shimmer 2s linear infinite",
        "pulse-glow": "pulseGlow 3s infinite",
        "bg-pulse": "bgPulse 15s ease-in-out infinite alternate",
        "slide-in-right": "slideInRight 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards",
        "screen-enter": "screenEnter 0.4s ease forwards",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUpFade: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slowScale: {
          "0%": { transform: "scale(1)" },
          "100%": { transform: "scale(1.05)" },
        },
        blurToClear: {
          "0%": { filter: "blur(10px)", opacity: "0" },
          "100%": { filter: "blur(0)", opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideDown: {
          "0%": { opacity: "0", transform: "translateY(-10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        pulseGlow: {
          "0%": { boxShadow: "0 0 10px rgba(243,178,171,0.45)" },
          "50%": { boxShadow: "0 0 25px rgba(243,178,171,0.4), 0 0 5px #F3B2AB" },
          "100%": { boxShadow: "0 0 10px rgba(243,178,171,0.45)" },
        },
        bgPulse: {
          "0%": { transform: "scale(1) translate(0, 0)" },
          "50%": { transform: "scale(1.1) translate(2%, -2%)" },
          "100%": { transform: "scale(1) translate(-2%, 2%)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(30px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        screenEnter: {
          "0%": { opacity: "0", transform: "scale(0.98)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      borderRadius: {
        "3xl": "24px",
        "2xl": "16px",
      },
    },
  },
  plugins: [],
};
export default config;

import type { Config } from "tailwindcss";

/**
 * Tema "Proyector": fondos claros, texto casi-negro, acentos saturados.
 * Pensado para proyectarse en pantallas con poca luz ambiente.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        proyector: {
          fondo: "#FAFAFA",
          panel: "#FFFFFF",
          texto: "#1F2937",
          textoSuave: "#4B5563",
          borde: "#E5E7EB",
          acento: "#1D4ED8"
        },
        // Colores por categoría bíblica (también usados como CSS vars en globals.css)
        cat: {
          pentateuco: "#F59E0B",
          historicos_at: "#3B82F6",
          sapienciales: "#8B5CF6",
          profeticos: "#10B981",
          evangelios: "#F87171",
          hechos: "#FB923C",
          cartas: "#14B8A6",
          apocaliptico: "#EC4899"
        },
        // Botones de respuesta A/B/C/D estilo Kahoot, alto contraste
        respuesta: {
          a: "#DC2626",
          b: "#2563EB",
          c: "#CA8A04",
          d: "#16A34A"
        }
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif']
      },
      fontSize: {
        // Tamaños grandes para proyector
        "proyector-titulo": ["clamp(2rem, 4vw, 4rem)", { lineHeight: "1.1", fontWeight: "800" }],
        "proyector-pregunta": ["clamp(1.5rem, 3vw, 3rem)", { lineHeight: "1.2", fontWeight: "700" }],
        "proyector-codigo": ["clamp(3rem, 8vw, 8rem)", { lineHeight: "1", fontWeight: "900", letterSpacing: "0.1em" }]
      },
      animation: {
        "tile-pop": "tilePop 0.3s ease-out",
        "fade-in": "fadeIn 0.3s ease-out",
        "shake": "shake 0.4s ease-in-out",
        "pulse-soft": "pulseSoft 1.5s ease-in-out infinite"
      },
      keyframes: {
        tilePop: {
          "0%": { transform: "scale(0.8)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" }
        },
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "25%": { transform: "translateX(-8px)" },
          "75%": { transform: "translateX(8px)" }
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" }
        }
      }
    }
  },
  plugins: []
};

export default config;

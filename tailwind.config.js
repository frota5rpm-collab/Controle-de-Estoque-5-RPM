/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        pmmg: {
            brown: '#958458', // Cor Caqui do Fundo
            primary: '#4A3B2A', // Marrom Escuro
            success: '#556B2F', // Verde Oliva
            accent: '#C5A059', // Dourado
        },
        police: {
            50: '#f0f9ff',
            100: '#e0f2fe',
            200: '#bae6fd',
            300: '#7dd3fc',
            400: '#38bdf8',
            500: '#0ea5e9',
            600: '#0284c7',
            700: '#0369a1',
            800: '#075985',
            900: '#0c4a6e',
        }
      },
    },
  },
  plugins: [],
}
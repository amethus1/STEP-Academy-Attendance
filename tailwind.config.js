/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                'brand': {
                    'light': '#e0f2fe',
                    'DEFAULT': '#0ea5e9',
                    'dark': '#0369a1',
                },
            },
        },
    },
    plugins: [],
}

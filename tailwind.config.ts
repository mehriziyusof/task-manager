// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  // مسیریابی برای شناسایی کلاس‌های Tailwind در تمام فایل‌ها
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // این بخش برای توسعه بیشتر Tailwind در آینده است
    },
  },
  plugins: [],
}
export default config
// postcss.config.mjs
// این کد باید مشکل PostCSS/Turbopack را حل کند.

const config = {
  plugins: {
    // ✅ نام استاندارد پلاگین Tailwind CSS (نه نام کامل پکیج)
    tailwindcss: {}, 
    autoprefixer: {},
  },
};

export default config;
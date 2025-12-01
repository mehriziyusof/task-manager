// postcss.config.mjs

const config = {
  plugins: {
    // ✅ استفاده از نام کامل پکیج نصب‌شده
    "@tailwindcss/postcss": {}, 
    // استفاده از Autoprefixer برای سازگاری مرورگرها
    "autoprefixer": {}, 
  },
};

export default config;
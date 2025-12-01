// postcss.config.mjs
// این کد، نام پکیج نصب‌شده شما را به صورت صحیح در PostCSS رجیستر می‌کند.

const config = {
  plugins: {
    // ✅ نام کامل پکیج PostCSS Wrapper برای Tailwind v4
    "@tailwindcss/postcss": {}, 
    autoprefixer: {},
  },
};

export default config;
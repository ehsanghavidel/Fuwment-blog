/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  /**
   * ⚠️ `@napi-rs/canvas` یک ماژول **بومی** است و باید بیرون از باندل
   * سرور بماند.
   *
   * بدون این خط، وبپک تلاش می‌کند bundle‌اش کند و بیلد با پیام
   * `Cannot find module './skia.darwin-arm64.node'` می‌شکند — چون فایل
   * باینریِ مخصوص پلتفرم در باندل کپی نمی‌شود.
   *
   * خطا موقعی ظاهر شد که اولین مصرف‌کننده اضافه شد (مسیر رندر)، نه
   * موقعی که وابستگی نصب شد. Next فقط چیزی را باندل می‌کند که از یک
   * route قابل دسترسی باشد.
   *
   * ⚠️ در Next 14 این کلید زیر `experimental` است. در Next 15 به سطح
   * بالا منتقل شده و نامش `serverExternalPackages` شده — موقع ارتقا
   * باید جابه‌جا شود، وگرنه Next فقط یک هشدار «Unrecognized key»
   * می‌دهد و بیلد دوباره با همان خطای ماژول بومی می‌شکند.
   */
  experimental: {
    serverComponentsExternalPackages: ["@napi-rs/canvas"],
  },
};

export default nextConfig;

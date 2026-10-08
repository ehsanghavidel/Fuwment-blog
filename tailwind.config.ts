import type { Config } from "tailwindcss";
// ⚠️ مسیر نسبی، نه `@/`: Tailwind این فایل را با jiti بارگذاری می‌کند.
import { PALETTE } from "./src/lib/brand/visual";

/**
 * توکن‌های دیزاین — پالت رسمی فومنت (راهنمای برند v3.7).
 *
 * ⚠️ hexهای پالت رسمی از `src/lib/brand/visual.ts` می‌آیند — همان منبعی که
 * رندرکننده‌ی PNG (`slide-spec.ts`) می‌خواند. فقط مقادیرِ غیررسمیِ مخصوص
 * استودیو (سطح روشن، مقیاس brand، رنگ‌های معنایی) اینجا مانده‌اند.
 *
 * نسبت هدف: ۶۰٪ سرمه‌ای · ۲۵٪ خنثی · ۱۰٪ فیروزه‌ای · ۵٪ نارنجی.
 *
 * ⚠️ نارنجی فقط برای «اقدام» است و در هر صفحه فقط یک دکمه‌ی نارنجی مجاز
 * است. برای همین `amber` عمداً به هیچ نقش تزئینی نگاشت نشده — کلاس
 * `.btn-action` در globals.css تنها مصرف‌کننده‌ی رسمی آن است.
 *
 * نام‌های قدیمی (pine/brass/bone/sand/brand) عمداً حفظ شده‌اند و به
 * نزدیک‌ترین رنگ فومنت نگاشت شده‌اند: حدود ۳۷۰ استفاده در کد دارند و
 * بازنویسی تک‌تکشان ریسک جاماندن داشت، در حالی که نگاشتِ مقدار، کل
 * رابط را یک‌جا و قطعی عوض می‌کند.
 * نگاشتِ مهم: `brass` → فیروزه‌ای، نه نارنجی. brass نقش تزئینی دارد
 * (لینک، مارکر لیست، خط کنار H2) و نارنجی‌کردنش قاعده‌ی «فقط اقدام» را
 * می‌شکست.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ── پالت رسمی فومنت ──
        navy: { DEFAULT: PALETTE.navy, deep: PALETTE.navyDeep, card: PALETTE.navyCard },
        /**
         * `light` برای متن فیروزه‌ای روی سرمه‌ای است (کنتراست ۴.۹۳).
         * `dark` از پالت رسمی نیست و برای متن فیروزه‌ای روی **سفید** اضافه
         * شده: هم اصلی (۲.۹۹) و هم روشن (۲.۵۰) آنجا از حد AA پایین‌ترند —
         * و روشن‌تر یعنی کنتراست کمتر، نه بیشتر. `dark` نسبت ۴.۸۸ می‌دهد.
         */
        teal: { DEFAULT: PALETTE.teal, light: PALETTE.tealLight, dark: "#147F71" },
        amber: { DEFAULT: PALETTE.orange, light: PALETTE.orangeLight },
        mist: PALETTE.mist,
        /**
         * `DEFAULT` برای متن فرعی روی سرمه‌ای است (کنتراست ۵.۶۵).
         * روی سفید فقط ۲.۱۸ می‌دهد، پس آنجا از `dark` استفاده کنید.
         */
        slateblue: { DEFAULT: PALETTE.slate, dark: "#55707E" },

        // ── نام‌های قدیمی، نگاشت‌شده به پالت فومنت ──
        pine: { DEFAULT: PALETTE.navy, dark: PALETTE.navyDeep },
        brass: { DEFAULT: PALETTE.teal, dark: "#178A7C" },
        bone: PALETTE.mist,
        sand: "#D3E1E8",

        /**
         * متن — جوهر برای اصلی، خاکستری‌آبی تیره برای فرعی.
         *
         * ⚠️ `muted` حدود ۶۷ بار برای متن فرعی روی سطح روشن استفاده می‌شود.
         * خاکستری‌آبیِ پالت (#9DB3BD) آنجا فقط ۲.۱۸ کنتراست می‌دهد و ناخواناست؛
         * حتی #6E8794 هم ۳.۷۸ بود. این مقدار ۵.۲۴ می‌دهد و از AA رد می‌شود.
         */
        ink: {
          DEFAULT: PALETTE.ink,
          soft: "#25454F",
          muted: "#55707E",
        },

        // سطوح: سفید (کارت)، خنثی روشن (پس‌زمینه)، خط
        surface: {
          DEFAULT: "#ffffff",
          dim: PALETTE.mist,
          line: "#D3E1E8",
        },

        // «brand» = مقیاس سرمه‌ای؛ کنش ساختاری (نه اقدام اصلی) سرمه‌ای است
        brand: {
          50: "#EAF1F5",
          100: "#D3E1E8",
          200: "#AFC7D3",
          300: "#7FA3B4",
          400: "#4A7A90",
          500: "#1D5670",
          600: PALETTE.navy,
          700: PALETTE.navyDeep,
          800: "#061F29",
          900: "#04161E",
        },

        // رنگ‌های معنایی — موفقیت فیروزه‌ای (رنگ «مسیر و موفقیت» برند)
        success: { DEFAULT: PALETTE.teal, soft: "#E2F4F1" },
        warn: { DEFAULT: "#B26A05", soft: "#FDF0DC" },
        danger: { DEFAULT: "#D9553A", soft: "#FFECE6" },
        error: PALETTE.error,
      },
      fontFamily: {
        // فارسی: وزیرمتن · انگلیسی: Inter (هر دو در layout.tsx بارگذاری می‌شوند)
        sans: ["var(--font-vazirmatn)", "var(--font-inter)", "Tahoma", "sans-serif"],
        heading: ["var(--font-vazirmatn)", "var(--font-inter)", "sans-serif"],
        latin: ["var(--font-inter)", "var(--font-vazirmatn)", "sans-serif"],
      },
      fontSize: {
        // مقیاس رسمی برند: [اندازه، {ارتفاع خط، وزن}]
        display: ["2.5rem", { lineHeight: "1.4", fontWeight: "800" }], // H1 ۴۰px
        headline: ["2rem", { lineHeight: "1.4", fontWeight: "800" }], // H1 کوچک ۳۲px
        title: ["1.5rem", { lineHeight: "1.5", fontWeight: "700" }], // H2 ۲۴px
        body: ["1rem", { lineHeight: "1.8", fontWeight: "400" }], // بدنه ۱۶px
        caption: ["0.75rem", { lineHeight: "1.6", fontWeight: "500" }], // کپشن ۱۲px
        btn: ["0.9375rem", { lineHeight: "1.4", fontWeight: "700" }], // دکمه ۱۵px
      },
      boxShadow: {
        // سایه‌ها بر پایه‌ی سرمه‌ای، نه مشکی خام
        card: "0 1px 2px rgba(14,57,74,0.05), 0 8px 24px rgba(14,57,74,0.06)",
        raised: "0 2px 4px rgba(14,57,74,0.06), 0 12px 32px rgba(14,57,74,0.08)",
        overlay: "0 16px 40px -8px rgba(7,42,56,0.22)",
      },
      borderRadius: {
        xl2: "1rem",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.3s ease-out both",
        "pulse-dot": "pulse-dot 1.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;

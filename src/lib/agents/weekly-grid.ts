import type { BrandRoute } from "./brand-cta";
import { AUDIENCE_GROUPS } from "./types";

/**
 * شبکه‌ی هفتگی — پیکربندی برند، نه خروجی مدل.
 *
 * ⚠️ تصمیم مرکزی برنامه‌ریز: این چهار فیلد هرگز از مدل پرسیده نمی‌شوند.
 *
 * دلیلش نسبت محتواست. برندگاید ۷۰٪ آموزش، ۲۰٪ اثبات و ۱۰٪ فروش مستقیم
 * را الزام کرده. اگر contentType را مدل انتخاب کند، هر هفته چیز دیگری
 * می‌دهد و این نسبت هرگز تضمین نمی‌شود. با شبکه، نسبت ساختاری است —
 * قابل نقض نیست چون اصلاً پرسیده نمی‌شود.
 *
 * همان استدلال route و language: تصمیم اجرا، نه قضاوت مدل.
 *
 * روز صفر شنبه است، مطابق src/lib/week.ts.
 * انگلیسی route="brand" می‌گیرد چون مخاطبش نهاد و شریک بین‌المللی است،
 * نه متقاضی یک مسیر مشخص — پس audienceGroup هم ندارد.
 */

export type ContentType = "education" | "proof" | "sales";

export type WeeklySlotConfig = {
    /** ۰ = شنبه … ۶ = جمعه */
    day: number;
    dayLabel: string;
    language: "fa" | "en";
    route: BrandRoute;
    audienceGroup: (typeof AUDIENCE_GROUPS)[number] | null;
    contentType: ContentType;
};

export const WEEKLY_GRID: readonly WeeklySlotConfig[] = [
    { day: 0, dayLabel: "شنبه", language: "fa", route: "global-talent", audienceGroup: "digital-tech", contentType: "education" },
    { day: 1, dayLabel: "یکشنبه", language: "fa", route: "global-talent", audienceGroup: "academic-research", contentType: "education" },
    { day: 2, dayLabel: "دوشنبه", language: "en", route: "brand", audienceGroup: null, contentType: "education" },
    { day: 3, dayLabel: "سه‌شنبه", language: "fa", route: "innovator-founder", audienceGroup: "entrepreneurship", contentType: "proof" },
    { day: 4, dayLabel: "چهارشنبه", language: "fa", route: "global-talent", audienceGroup: "engineering-medical", contentType: "education" },
    { day: 5, dayLabel: "پنجشنبه", language: "en", route: "brand", audienceGroup: null, contentType: "education" },
    { day: 6, dayLabel: "جمعه", language: "fa", route: "global-talent", audienceGroup: "arts-culture", contentType: "sales" },
] as const;

/** توضیح نوع محتوا برای تزریق به پرامپت برنامه‌ریز */
export const CONTENT_TYPE_BRIEFING: Record<ContentType, string> = {
    education:
        "آموزشی — چیزی یاد بده که مخاطب بعدش بتواند کاری بکند. این محتوا نباید بفروشد.",
    proof:
        "اثبات — نشان بده مسیر واقعی است و چطور کار می‌کند. مثال ملموس، بدون آمار ساختگی.",
    sales:
        "فروش مستقیم — دعوت روشن به قدم بعدی. تنها جای هفته که اجازه‌ی فروش دارد.",
};
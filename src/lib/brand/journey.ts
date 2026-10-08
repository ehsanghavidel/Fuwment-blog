/**
 * هفت مرحله‌ی سفر مخاطب — بخش ۰۳ راهنمای برند v3.7.
 *
 * قانون تولید محتوای راهنما: پیش از ساخت هر محتوا باید مشخص باشد برای
 * کدام گروه و کدام مرحله است. اگر پاسخ هرکدام «همه» بود، محتوا آماده نیست.
 *
 * ⚠️ «سفر مخاطب» خودش واژه‌ی داخلی است — شناسه‌ها و توضیح‌های این فایل
 * برای پرامپت‌اند و هرگز در متن مخاطب نمی‌آیند.
 */

export const JOURNEY_STAGES = [
  "unaware",
  "curious",
  "evaluating",
  "decision",
  "in-journey",
  "success",
  "referral",
] as const;

export type JourneyStage = (typeof JOURNEY_STAGES)[number];

/** نگهبان نوع — برای ورودی‌هایی که از بیرون (درخواست، دیتابیس) می‌رسند */
export function isJourneyStage(v: unknown): v is JourneyStage {
  return typeof v === "string" && (JOURNEY_STAGES as readonly string[]).includes(v);
}

export const JOURNEY: Record<JourneyStage, { label: string; question: string; job: string }> = {
  unaware: {
    label: "ناآگاه",
    question: "اصلاً همچین ویزایی هست؟",
    job: "معرفی امکان، بدون فروش — محتوای افسانه‌زدایی، کیس‌های واقعی رشته‌های مختلف",
  },
  curious: {
    label: "کنجکاو",
    question: "من هم می‌توانم؟",
    job: "کمک به خودارزیابی — ارزیابی مسیر، «چه چیزی در مسیر شما مدرک است»",
  },
  evaluating: {
    label: "سنجش",
    question: "به کی اعتماد کنم؟",
    job: "نشان‌دادن راهنما — معرفی منتورها، رضایت‌های تحول‌محور، تعهدهای فومنت",
  },
  decision: {
    label: "تصمیم",
    question: "ارزش هزینه‌اش را دارد؟",
    job: "روشن‌کردن مسیر و ریسک — مراحل کار، جلسه‌ی ارزیابی، مقایسه‌ی صادقانه‌ی گزینه‌ها",
  },
  "in-journey": {
    label: "همراهی",
    question: "الان کجای کارم؟",
    job: "کاهش اضطراب حین مسیر — نقشه‌ی شخصی‌سازی‌شده، گزارش وضعیت، نقطه‌ی تماس مشخص",
  },
  success: {
    label: "موفقیت",
    question: "حالا چه؟",
    job: "نام‌گذاری لحظه‌ی تحول — پیام تبریک، محتوای استقرار، دعوت به روایت تجربه",
  },
  referral: {
    label: "معرفی",
    question: "به کی بگویم؟",
    job: "آسان‌کردن معرفی — لینک قابل اشتراک ارزیابی مسیر",
  },
};

/** فهرست انتخاب برای پرامپت — شناسه + سؤال مخاطب + کار ما */
export function journeyChoiceListFa(): string {
  return JOURNEY_STAGES.map(
    (s) => `  · ${s} (${JOURNEY[s].label}) — «${JOURNEY[s].question}» ${JOURNEY[s].job}`
  ).join("\n");
}

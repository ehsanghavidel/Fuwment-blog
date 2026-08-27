import "server-only";
import { getStore, type SocialPost } from "@/lib/store";
import type { BrandRoute } from "@/lib/company";
import { keywordCandidates, dmCtaLine, DM_LINE_SEPARATOR } from "@/lib/dm-keyword";
import { checkDmCtaLine, DM_CTA_CHECK_NAME } from "./social-checks";

/**
 * رزروِ اتمیِ کلیدواژه‌ی دایرکت برای یک پستِ از‌پیش‌منتشرشده — فاز ۵.
 *
 * فقط ارکستریشن است: کاندیدسازی و متنِ CTA از توابعِ خالصِ `dm-keyword.ts`
 * می‌آیند، نوشتنِ اتمی از `store.updateSocialPostWithDmKeyword` (Stage ۱) —
 * اینجا نه کانونیکال‌سازی دوباره پیاده می‌شود، نه کاندیدسازیِ دوباره، نه
 * دسترسیِ خامِ Supabase.
 *
 * ⚠️ `originalBody` همیشه بدنه‌ی **ورودیِ** تابع است، نه نتیجه‌ی تلاشِ
 * قبلی — وگرنه تلاشِ دوم روی خطِ CTAیِ تلاشِ اول می‌نشست و دو خط می‌ساخت.
 * چون تلاشِ ناموفق چیزی نمی‌نویسد (۲۳۵۰۵ یعنی صفر ستون تغییر کرد)، بدنه‌ی
 * دیتابیس هم بینِ تلاش‌ها دست‌نخورده می‌ماند.
 */
export async function reserveDmKeywordForPost(input: {
  post: SocialPost;
  route: BrandRoute;
}): Promise<{ keyword: string; attempts: number }> {
  const store = getStore();
  const { post, route } = input;

  const originalBody = post.body;
  // دفاعی: اگر به هر دلیلی چکِ دایرکتِ قبلی روی این پست مانده باشد،
  // تکرار نمی‌شود — همیشه دقیقاً یک چکِ دایرکت.
  const baseChecks = post.checks.filter((c) => c.name !== DM_CTA_CHECK_NAME);
  const candidates = keywordCandidates(route, post.id);

  let attempts = 0;
  for (const candidate of candidates) {
    attempts++;
    const body = originalBody + DM_LINE_SEPARATOR + dmCtaLine(candidate, post.language);
    const patch = {
      dmKeyword: candidate,
      body,
      checks: [...baseChecks, checkDmCtaLine(body, candidate, post.language)],
      extras: post.extras,
    };

    // false فقط یعنی ۲۳۵۰۵ (تصادمِ ایندکسِ یکتا) — کاندیدِ بعدی را امتحان
    // می‌کنیم. هر throwِ دیگر همین‌جا بالا می‌رود، بدونِ تلاشِ بعدی.
    const reserved = await store.updateSocialPostWithDmKeyword(post.id, patch);
    if (reserved) return { keyword: candidate, attempts };

    console.log(
      `[dm-keyword] برخوردِ ایندکسِ یکتا روی کاندیدِ «${candidate}» برای پستِ ${post.id} — تلاشِ بعدی`
    );
  }

  const msg = `[dm-keyword] همه‌ی ${candidates.length} کاندید برای پستِ ${post.id} (مسیرِ ${route}) گرفته شده بودند`;
  console.error(msg);
  throw new Error(msg);
}

import { NextRequest } from "next/server";
import { z } from "zod";
import { getStore } from "@/lib/store";
import { isStudioAuthorized, unauthorized } from "@/lib/auth";
import { canonicalizeKeyword, applyDmCta, type DmCtaFailureReason } from "@/lib/dm-keyword";
import { checkDmCtaLine, DM_CTA_CHECK_NAME } from "@/lib/agents/social-checks";
import type { SocialPost } from "@/lib/store/types";

/**
 * PATCH /api/social/posts/[id] — تأیید/بازگرداندن به پیش‌نویس، و از فاز ۵
 * به بعد، مدیریتِ دستیِ کلیدواژه/آفرِ دایرکت روی کاروسل.
 *
 * توجه: «approved» یعنی «انسان این محتوا را برای انتشار دستی تأیید کرد».
 * هیچ فراخوانی شبکه‌ای به اینستاگرام یا لینکدین انجام نمی‌شود — انتشار
 * خودکار نیازمند حساب بیزنسی و تأیید پارتنر است و عمداً خارج از دامنه‌ی
 * این پروژه‌ی آموزشی مانده. خروجی را از استودیو کپی کنید.
 *
 * ⚠️ `dmKeyword`/`dmOffer` فقط برای کاروسل معنی دارند. فقط وقتی یکی از این
 * دو کلید در بدنه‌ی درخواست حاضر است «جهشِ دایرکت» تشخیص داده می‌شود؛
 * PATCHِ فقط‌status برای همه‌ی قالب‌ها (استوری، ریلز، …) دقیقاً همان رفتارِ
 * قبل از فاز ۵ را دارد — رگرسیونِ صفر.
 */

export const dynamic = "force-dynamic";

const BodySchema = z
  .object({
    status: z.enum(["draft", "approved"]).optional(),
    dmKeyword: z.string().nullable().optional(),
    dmOffer: z.string().max(200).nullable().optional(),
  })
  .refine(
    (b) => b.status !== undefined || b.dmKeyword !== undefined || b.dmOffer !== undefined,
    { message: "حداقل یکی از status، dmKeyword یا dmOffer باید داده شود." }
  );

const DM_CTA_FAILURE_MESSAGE: Record<DmCtaFailureReason, string> = {
  "missing-old-line":
    "خطِ سیستمِ کلیدواژه‌ی فعلی در متنِ پست پیدا نشد — احتمالاً متن دستی ویرایش شده. پست را در استودیو بررسی کنید.",
  "duplicate-old-line":
    "خطِ سیستمِ کلیدواژه‌ی فعلی بیش از یک‌بار در متنِ پست تکرار شده — پست را دستی بررسی کنید.",
  "duplicate-new-line":
    "خطِ سیستمِ کلیدواژه‌ی جدید از قبل در متنِ پست وجود دارد.",
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isStudioAuthorized(req)) return unauthorized();

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "بدنه‌ی درخواست نامعتبر است." }, { status: 400 });
  }
  const { status, dmKeyword, dmOffer } = parsed.data;

  const store = getStore();
  const post = await store.getSocialPost(params.id);
  if (!post) return Response.json({ error: "محتوا پیدا نشد." }, { status: 404 });

  // بدنه‌ی درخواست از undefined در JSON.parse نمی‌تواند شامل باشد، پس
  // `!== undefined` دقیقاً یعنی «این کلید در JSON بود».
  const dmKeywordProvided = dmKeyword !== undefined;
  const dmOfferProvided = dmOffer !== undefined;
  const isDmMutation = dmKeywordProvided || dmOfferProvided;

  // ── مسیرِ قدیمی: فقط status، برای هر قالبی — دست‌نخورده از قبل فاز ۵ ──
  if (!isDmMutation) {
    await store.updateSocialPost(params.id, {
      status,
      approvedAt:
        status === "approved" ? post.approvedAt ?? new Date().toISOString() : post.approvedAt,
    });
    return Response.json({ ok: true });
  }

  // ── از اینجا به بعد: جهشِ دایرکت — فقط کاروسل ──
  if (post.format !== "carousel") {
    return Response.json(
      { error: "کلیدواژه/آفرِ دایرکت فقط برای کاروسلِ اینستاگرام قابلِ‌تنظیم است." },
      { status: 400 }
    );
  }

  // آفرِ مؤثر: مقدارِ نرمال‌شده‌ی درخواست اگر کلیدش حاضر بود، وگرنه آفرِ فعلیِ پست
  const normalizedRequestOffer = dmOfferProvided ? (dmOffer ?? "").trim() || null : null;
  const effectiveOffer = dmOfferProvided ? normalizedRequestOffer : post.extras.dmOffer ?? null;

  // کلیدواژه‌ی نهایی: null صریح = آزادسازی (هرگز وارد canonicalizer نمی‌شود)
  let newKeyword: string | null;
  if (dmKeywordProvided) {
    if (dmKeyword === null) {
      newKeyword = null;
    } else {
      const canonical = canonicalizeKeyword(dmKeyword);
      if (canonical === null) {
        return Response.json(
          { error: "کلیدواژه نامعتبر یا رزروشده است." },
          { status: 400 }
        );
      }
      newKeyword = canonical;
    }
  } else {
    newKeyword = post.dmKeyword;
  }

  if (newKeyword !== null && !effectiveOffer) {
    return Response.json(
      { error: "کلیدواژه بدونِ آفرِ دایرکت معنی ندارد — اول آفر را وارد کنید." },
      { status: 400 }
    );
  }

  // تنها مسیرِ مجازِ جهشِ CTA — هیچ دست‌کاریِ مستقیمِ body در این فایل
  const ctaResult = applyDmCta({
    body: post.body,
    language: post.language,
    oldKeyword: post.dmKeyword,
    newKeyword,
  });
  if (!ctaResult.ok) {
    return Response.json({ error: DM_CTA_FAILURE_MESSAGE[ctaResult.reason] }, { status: 409 });
  }

  const baseChecks = post.checks.filter((c) => c.name !== DM_CTA_CHECK_NAME);
  const newChecks =
    newKeyword !== null
      ? [...baseChecks, checkDmCtaLine(ctaResult.body, newKeyword, post.language)]
      : baseChecks;

  const statusPatch: Partial<SocialPost> =
    status !== undefined
      ? {
          status,
          approvedAt: status === "approved" ? post.approvedAt ?? new Date().toISOString() : post.approvedAt,
        }
      : {};

  const patch: Partial<SocialPost> = {
    dmKeyword: newKeyword,
    body: ctaResult.body,
    checks: newChecks,
    // همیشه spread — stickers/sourceSocialPostId و بقیه‌ی extras نباید پاک شوند
    extras: { ...post.extras, dmOffer: effectiveOffer ?? undefined },
    ...statusPatch,
  };

  try {
    // «null → کلیدواژه» و «کلیدواژه → کلیدواژه‌ی متفاوت» باید از مسیرِ
    // اتمیِ آگاه‌به‌تصادم بروند — ایندکسِ یکتا اینجا واقعاً ممکن است رد کند.
    if (newKeyword !== null && newKeyword !== post.dmKeyword) {
      const reserved = await store.updateSocialPostWithDmKeyword(params.id, {
        ...patch,
        dmKeyword: newKeyword,
      });
      if (!reserved) {
        return Response.json(
          { error: `کلیدواژه‌ی «${newKeyword}» قبلاً برای پستِ دیگری رزرو شده است.` },
          { status: 409 }
        );
      }
    } else {
      // آزادسازی (→ null) یا بدونِ تغییرِ کلیدواژه (فقط آفر/status) — یک
      // UPDATE معمولی، بدونِ نگرانیِ تصادم چون ستون یا null می‌شود یا
      // همان مقدارِ از‌قبل‌رزروشده‌ی همین ردیف می‌ماند.
      await store.updateSocialPost(params.id, patch);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }

  return Response.json({ ok: true });
}

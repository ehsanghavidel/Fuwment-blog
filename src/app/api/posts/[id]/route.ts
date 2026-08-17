import { NextRequest } from "next/server";
import { z } from "zod";
import { getStore } from "@/lib/store";
import { isStudioAuthorized, unauthorized } from "@/lib/auth";
import { syncPostToWordPress } from "@/lib/wordpress";

/**
 * PATCH /api/posts/[id] — انتشار/بازگرداندن به پیش‌نویس.
 * این همان نقطه‌ی human-in-the-loop است: پست‌هایی که ویراستار تأیید نکرده،
 * فقط از اینجا (تصمیم انسان) منتشر می‌شوند.
 *
 * تأیید انسانی، دومین نقطه‌ی انتقال به وردپرس است (اولی پایان پایپ‌لاین
 * برای پست‌های خودکارْ تأییدشده). نتیجه‌ی انتقال در پاسخ برمی‌گردد تا
 * استودیو بتواند خطا را نشان دهد — ولی هرگز باعث شکست خودِ تأیید نمی‌شود.
 */

export const dynamic = "force-dynamic";

const BodySchema = z.object({ status: z.enum(["draft", "published"]) });

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isStudioAuthorized(req)) return unauthorized();

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "بدنه‌ی درخواست نامعتبر است." }, { status: 400 });
  }

  const store = getStore();
  const post = await store.getPost(params.id);
  if (!post) return Response.json({ error: "پست پیدا نشد." }, { status: 404 });

  await store.updatePost(params.id, {
    status: parsed.data.status,
    publishedAt:
      parsed.data.status === "published"
        ? post.publishedAt ?? new Date().toISOString()
        : post.publishedAt,
  });

  // بعد از تأیید، انتقال به وردپرس. اگر از قبل رفته باشد،
  // syncPostToWordPress خودش «already-sent» برمی‌گرداند و دوباره نمی‌فرستد.
  // بازگرداندن به پیش‌نویس هیچ کاری در وردپرس نمی‌کند — پستی که آنجا ساخته
  // شده مال انسان است و ما پاکش نمی‌کنیم.
  const wordpress =
    parsed.data.status === "published" ? await syncPostToWordPress(params.id) : null;

  return Response.json({ ok: true, wordpress });
}

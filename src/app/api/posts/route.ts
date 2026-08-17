import { NextRequest } from "next/server";
import { getStore } from "@/lib/store";
import { isStudioAuthorized, unauthorized } from "@/lib/auth";
import { isWordPressConfigured } from "@/lib/wordpress";

/** GET /api/posts — همه‌ی پست‌ها (پیش‌نویس و منتشرشده) برای استودیو */

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isStudioAuthorized(req)) return unauthorized();
  const posts = await getStore().listPosts();

  // پرچم پیکربندی، نه خودِ متغیرها. استودیو باید بداند دکمه‌ی «ارسال به
  // وردپرس» را نشان بدهد یا نه، بدون اینکه آدرس و نام کاربری به کلاینت
  // درز کند (که با NEXT_PUBLIC_ اتفاق می‌افتاد).
  return Response.json({ posts, wordpressEnabled: isWordPressConfigured() });
}

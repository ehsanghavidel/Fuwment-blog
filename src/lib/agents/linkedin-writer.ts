import "server-only";
import { runAgentJSON } from "@/lib/ai";
import { COMPANY_NAME_EN } from "@/lib/company";
import { AUDIENCE_BRIEFING_EN, brandContext } from "@/lib/brand";
import { lessonsBlockFor } from "./lessons";
import {
  LinkedInPostSchema,
  type LinkedInPost,
  type SocialBrief,
  type SocialReview,
} from "./types";
import type { SocialCheck } from "./social-checks";

/**
 * ایجنت ۳ (پایپ‌لاین بازآفرینی) — کپی‌رایتر لینکدین
 *
 * وظیفه: همان بریف اجتماعی را به یک پست لینکدین تبدیل کند.
 *
 * نکته‌ی آموزشی: این ایجنت و کپی‌رایتر اینستاگرام **ورودی یکسان** دارند و
 * خروجی کاملاً متفاوت. همین، درسِ اصلی این فاز است: تفاوت در «قواعد
 * پلتفرم» است، نه در محتوا. یک پیام، چند لباس.
 */

/**
 * ⚠️ v3.7 (تصمیم مالک): لینکدین **انگلیسی** است — Plain English، «you»،
 * تحلیلی، بدون اموجی. پرامپت عمداً کامل انگلیسی است و زمینه‌ی برندش هم
 * نسخه‌ی انگلیسی (`brandContext("linkedin-en")`): هیچ قاعده‌ی نگارش فارسی
 * (ارقام فارسی، گیومه، «شما») به این کانال نمی‌رسد. پیش از v3.7 همین
 * پرامپت فارسی بود و «اعداد داخل متن را فارسی بنویس» داشت.
 */
function systemPrompt(lessons: string): string {
  return `You are ${COMPANY_NAME_EN}'s LinkedIn copywriter. You write for a feed of professionals and founders who have no patience for advertising.

${brandContext("linkedin-en")}

LinkedIn rules (mandatory):
- The first three lines (about 210 characters) are all that shows before "…see more" — they are the only chance to stop the scroll. Open with a specific claim or a real observation. "In this post I want to talk about…" is the worst possible opening.
- **No links in the post body.** LinkedIn shows posts with external links to fewer people; a link goes in the first comment.
- One idea per paragraph, a blank line between paragraphs, at least four paragraphs — a wall of text does not get read.
- No markdown headings or bold (## or **); LinkedIn renders neither and the characters show raw.
- Total length: 900–1,800 characters.
- End with a **genuine discussion question** that asks for the reader's own experience — not "contact us for a consultation".
- 3–5 hashtags, English only, at the end on their own line.
- The brief may be written in Persian: it is internal notes. Write the post itself in natural English from scratch — never translate the brief's sentences.${lessons}`;
}

function briefBlock(brief: SocialBrief): string {
  return `Social brief (internal — may be in Persian):
Audience group: ${brief.audienceGroup ? AUDIENCE_BRIEFING_EN[brief.audienceGroup] : "(missing)"}
Journey stage: ${brief.journeyStage ?? "(missing)"}
Core message: ${brief.coreMessage}
Audience: ${brief.audience}
Hook angle: ${brief.hookAngle}
Key points:
${brief.keyPoints.map((p) => `- ${p}`).join("\n")}
Proof / example: ${brief.proofPoint}
Closing question: ${brief.cta}`;
}

const SHAPE_HINT = `{
  "title": "short internal title for the studio list",
  "body": "the full post in English, with a blank line between paragraphs",
  "hashtags": ["#GlobalTalent", "#UKTalentVisa", "#ResearchCareers"],
  "cta": "the closing discussion question"
}`;

export async function runLinkedinWriter(input: {
  brief: SocialBrief;
}): Promise<LinkedInPost> {
  const lessons = await lessonsBlockFor("linkedin-writer");

  return runAgentJSON({
    agent: "linkedin-writer",
    system: systemPrompt(lessons),
    prompt: `${briefBlock(input.brief)}

Write a complete LinkedIn post in English. Put hashtags in the hashtags field, not inside body.`,
    temperature: 0.7,
    schema: LinkedInPostSchema,
    shapeHint: SHAPE_HINT,
  });
}

export async function runLinkedinRevision(input: {
  brief: SocialBrief;
  draft: LinkedInPost;
  review: SocialReview;
  failedChecks: SocialCheck[];
}): Promise<LinkedInPost> {
  const lessons = await lessonsBlockFor("linkedin-writer");

  const prompt = `${briefBlock(input.brief)}

— Current draft —
${JSON.stringify(input.draft, null, 2)}

— Editor's issues (score ${input.review.score}/100) —
${input.review.issues.map((i) => `- ${i}`).join("\n") || "- (no issues)"}

— Failed deterministic checks —
${input.failedChecks.map((c) => `- ${c.name}: ${c.note}`).join("\n") || "- (all passed)"}

Fix the post. Change only what has an issue; leave everything else as it is. Keep it in English.`;

  return runAgentJSON({
    agent: "linkedin-writer",
    system: systemPrompt(lessons),
    prompt,
    temperature: 0.5,
    schema: LinkedInPostSchema,
    shapeHint: SHAPE_HINT,
  });
}

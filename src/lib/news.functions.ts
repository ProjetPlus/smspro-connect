import { createServerFn } from "@tanstack/react-start";
import { createPublicDataClient } from "./public-data-client";

export const listPublishedNews = createServerFn({ method: "GET" })
  .validator((d: { category?: string; tag?: string; limit?: number } | undefined) => d ?? {})
  .handler(async ({ data }) => {
    const sb = createPublicDataClient();
    let q = sb
      .from("news_posts")
      .select("id, title, slug, excerpt, cover_image_url, published_at, tags, category_id, news_categories(name,slug)")
      .eq("status", "published")
      .lte("published_at", new Date().toISOString())
      .order("published_at", { ascending: false })
      .limit(data.limit ?? 30);
    if (data.category) q = q.eq("news_categories.slug", data.category);
    if (data.tag) q = q.contains("tags", [data.tag]);
    const { data: rows, error } = await q;
    if (error) return [];
    if (data.category) return (rows ?? []).filter((r: any) => r.news_categories?.slug === data.category);
    return rows ?? [];
  });

export const getNewsBySlug = createServerFn({ method: "GET" })
  .validator((d: { slug: string }) => d)
  .handler(async ({ data }) => {
    const sb = createPublicDataClient();
    const { data: row } = await sb
      .from("news_posts")
      .select("*, news_categories(name,slug)")
      .eq("slug", data.slug)
      .eq("status", "published")
      .lte("published_at", new Date().toISOString())
      .maybeSingle();
    return row;
  });

export const listCategories = createServerFn({ method: "GET" }).handler(async () => {
  const sb = createPublicDataClient();
  const { data } = await sb.from("news_categories").select("*").order("name");
  return data ?? [];
});

export const listActiveHeroSlides = createServerFn({ method: "GET" })
  .validator((d: { context?: "all" | "sms" | "email" | "uemoa" } | undefined) => d ?? {})
  .handler(async ({ data }) => {
    const sb = createPublicDataClient();
    let q = sb
      .from("hero_slides")
      .select("*")
      .eq("is_active", true);
    if (data.context && data.context !== "all") {
      q = q.in("kind", [data.context, "news", "other"]);
    }
    const { data: slides, error } = await q.order("position", { ascending: true });
    return slides ?? [];
  });

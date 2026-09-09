import { createPublicDataClient } from "./public-data-client";

export type DynamicSitemapEntry = { path: string; lastmod?: string };

export async function getNewsSitemapEntries(): Promise<DynamicSitemapEntry[]> {
  const client = createPublicDataClient();
  const [{ data: posts }, { data: categories }] = await Promise.all([
    client
      .from("news_posts")
      .select("slug, updated_at, tags")
      .eq("status", "published")
      .lte("published_at", new Date().toISOString())
      .order("updated_at", { ascending: false }),
    client.from("news_categories").select("slug, updated_at").order("slug"),
  ]);

  const entries: DynamicSitemapEntry[] = [{ path: "/actualites" }];
  const tagDates = new Map<string, string>();

  for (const post of posts ?? []) {
    entries.push({ path: `/actualites/${encodeURIComponent(post.slug)}`, lastmod: post.updated_at });
    for (const tag of post.tags ?? []) {
      const current = tagDates.get(tag);
      if (!current || post.updated_at > current) tagDates.set(tag, post.updated_at);
    }
  }

  for (const category of categories ?? []) {
    entries.push({
      path: `/actualites/categorie/${encodeURIComponent(category.slug)}`,
      lastmod: category.updated_at,
    });
  }

  for (const [tag, lastmod] of tagDates) {
    entries.push({ path: `/actualites/tag/${encodeURIComponent(tag)}`, lastmod });
  }

  return entries;
}
import { createFileRoute } from "@tanstack/react-router";
import { getNewsSitemapEntries } from "@/lib/sitemap.server";

const BASE_URL = "https://smsmobilepro.lovable.app";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/solutions", changefreq: "monthly", priority: "0.8" },
          { path: "/tarifs", changefreq: "monthly", priority: "0.8" },
          { path: "/actualites", changefreq: "daily", priority: "0.9" },
          { path: "/a-propos", changefreq: "yearly", priority: "0.5" },
          { path: "/contact", changefreq: "yearly", priority: "0.5" },
          { path: "/confidentialite", changefreq: "yearly", priority: "0.3" },
          { path: "/conditions", changefreq: "yearly", priority: "0.3" },
        ];

        try {
          const dynamicEntries = await getNewsSitemapEntries();
          entries.push(...dynamicEntries.filter((entry) => entry.path !== "/actualites").map((entry) => ({
            ...entry,
            changefreq: entry.path === "/actualites" ? "daily" as const : "weekly" as const,
            priority: entry.path === "/actualites" ? "0.9" : "0.6",
          })));
        } catch (error) {
          console.error("Unable to append news sitemap entries", error);
        }

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});

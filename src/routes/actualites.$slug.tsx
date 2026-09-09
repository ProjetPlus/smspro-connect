import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site-chrome";
import { getNewsBySlug } from "@/lib/news.functions";

export const Route = createFileRoute("/actualites/$slug")({
  component: NewsDetail,
  loader: async ({ params }) => {
    const post = await getNewsBySlug({ data: { slug: params.slug } });
    if (!post) throw notFound();
    return post;
  },
  head: ({ loaderData }) => {
    const p = loaderData as any;
    if (!p) return { meta: [{ title: "Actualité" }] };
    const title = `${p.title} — SMS Pro Mobile`;
    const desc = p.excerpt ?? p.title;
    const url = `https://smsmobilepro.lovable.app/actualites/${p.slug}`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: p.title },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
        { property: "og:type", content: "article" },
        { property: "og:url", content: `https://smsmobilepro.lovable.app/actualites/${p.slug}` },
        { name: "twitter:card", content: p.cover_image_url ? "summary_large_image" : "summary" },
        { name: "twitter:title", content: p.title },
        { name: "twitter:description", content: p.excerpt ?? p.title },
        { name: "twitter:title", content: p.title },
        { name: "twitter:description", content: desc },
        ...(p.cover_image_url
          ? [
              { property: "og:image", content: p.cover_image_url },
              { name: "twitter:image", content: p.cover_image_url },
            ]
          : []),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "NewsArticle",
            headline: p.title,
            description: desc,
            datePublished: p.published_at ?? undefined,
            dateModified: p.updated_at ?? p.published_at ?? undefined,
            image: p.cover_image_url ? [p.cover_image_url] : undefined,
            mainEntityOfPage: { "@type": "WebPage", "@id": url },
            publisher: {
              "@type": "Organization",
              name: "SMS Pro Mobile",
              url: "https://smsmobilepro.lovable.app",
            },
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Accueil", item: "https://smsmobilepro.lovable.app/" },
              { "@type": "ListItem", position: 2, name: "Actualités", item: "https://smsmobilepro.lovable.app/actualites" },
              { "@type": "ListItem", position: 3, name: p.title, item: url },
            ],
          }),
        },
      ],
    };
  },
});

function NewsDetail() {
  const p = Route.useLoaderData() as any;
  return (
    <SiteLayout>
      <article className="px-4 pt-10 pb-20 sm:px-8">
        <div className="mx-auto max-w-3xl">
          <Link to="/actualites" className="text-xs font-mono uppercase tracking-widest text-foreground/60 hover:text-primary">
            ← Toutes les actualités
          </Link>
          <h1 className="mt-4 font-display font-extrabold text-3xl sm:text-5xl leading-tight text-balance">
            {p.title}
          </h1>
          <div className="mt-3 text-xs font-mono text-foreground/50">
            {p.published_at && new Date(p.published_at).toLocaleDateString("fr-FR", { dateStyle: "long" })}
          </div>
          {p.cover_image_url && (
            <img
              src={p.cover_image_url}
              alt={p.title}
              className="w-full mt-8 rounded-sm border border-border aspect-[16/9] object-cover"
            />
          )}
          {p.excerpt && (
            <p className="mt-8 text-lg text-foreground/70 leading-relaxed">{p.excerpt}</p>
          )}
          <div
            className="mt-6 prose prose-neutral max-w-none whitespace-pre-wrap text-foreground/80 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: (p.content || "").replace(/</g, "&lt;").replace(/\n/g, "<br/>") }}
          />
        </div>
      </article>
    </SiteLayout>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout, PageHero } from "@/components/site-chrome";
import { listPublishedNews } from "@/lib/news.functions";

export const Route = createFileRoute("/actualites/tag/$slug")({
  component: NewsByTag,
  loader: async ({ params }) => ({ items: await listPublishedNews({ data: { tag: params.slug } }), tag: params.slug }),
  head: ({ params }) => {
    const title = `Actualités — #${params.slug} — SMS Pro Mobile`;
    const desc = `Articles avec le tag #${params.slug}.`;
    const url = `https://smsmobilepro.lovable.app/actualites/tag/${params.slug}`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
        { property: "og:type", content: "website" },
      { property: "og:url", content: `https://smsmobilepro.lovable.app/actualites/tag/${params.slug}` },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: `Actualités — #${params.slug}` },
      { name: "twitter:description", content: `Articles avec le tag #${params.slug}.` },
        { name: "twitter:card", content: "summary" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: title,
            description: desc,
            url,
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
              { "@type": "ListItem", position: 3, name: `#${params.slug}`, item: url },
            ],
          }),
        },
      ],
    };
  },
});

function NewsByTag() {
  const { items, tag } = Route.useLoaderData() as any;
  return (
    <SiteLayout>
      <PageHero eyebrow={`Tag · #${tag}`} title={`Articles tagués #${tag}`} description={`Tous les articles avec le tag #${tag}.`} />
      <section className="px-4 pb-20 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <Link to="/actualites" className="text-xs font-mono uppercase tracking-widest text-foreground/60 hover:text-primary">← Toutes les actualités</Link>
          <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((n: any) => (
              <Link key={n.id} to="/actualites/$slug" params={{ slug: n.slug }} className="group bg-background border border-border rounded-sm overflow-hidden hover:border-primary transition-colors">
                {n.cover_image_url && <img src={n.cover_image_url} alt={n.title} loading="lazy" className="w-full aspect-[16/10] object-cover" />}
                <div className="p-4">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-foreground/50">
                    {n.published_at && new Date(n.published_at).toLocaleDateString("fr-FR")}
                  </div>
                  <h2 className="mt-1 font-display font-bold text-lg leading-snug group-hover:text-primary">{n.title}</h2>
                  {n.excerpt && <p className="text-sm text-foreground/70 mt-2 line-clamp-3">{n.excerpt}</p>}
                </div>
              </Link>
            ))}
            {items.length === 0 && <div className="col-span-full p-10 text-center text-foreground/50">Aucun article pour ce tag.</div>}
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}

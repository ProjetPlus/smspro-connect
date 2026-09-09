import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout, PageHero } from "@/components/site-chrome";
import { listPublishedNews, listCategories } from "@/lib/news.functions";

export const Route = createFileRoute("/actualites/categorie/$slug")({
  component: NewsByCategory,
  loader: async ({ params }) => {
    const cats = await listCategories();
    const cat = (cats as any[]).find((c) => c.slug === params.slug) ?? { name: params.slug, slug: params.slug };
    const items = await listPublishedNews({ data: { category: params.slug } });
    return { items, category: cat };
  },
  head: ({ loaderData, params }) => {
    const name = (loaderData as any)?.category?.name ?? params.slug;
    const title = `Actualités — ${name} — SMS Pro Mobile`;
    const desc = `Articles catégorie ${name} sur SMS Pro Mobile.`;
    const url = `https://smsmobilepro.lovable.app/actualites/categorie/${params.slug}`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
        { property: "og:type", content: "website" },
        { property: "og:url", content: `https://smsmobilepro.lovable.app/actualites/categorie/${params.slug}` },
        { name: "twitter:card", content: "summary" },
        { name: "twitter:title", content: `Actualités — ${name}` },
        { name: "twitter:description", content: `Articles catégorie ${name} sur SMS Pro Mobile.` },
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
              { "@type": "ListItem", position: 3, name: String(name), item: url },
            ],
          }),
        },
      ],
    };
  },
});

function NewsByCategory() {
  const { items, category } = Route.useLoaderData() as any;
  return (
    <SiteLayout>
      <PageHero eyebrow={`Catégorie · ${category.name}`} title={`Articles : ${category.name}`} description={category.description ?? "Tous les articles de cette catégorie."} />
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
            {items.length === 0 && <div className="col-span-full p-10 text-center text-foreground/50">Aucun article dans cette catégorie.</div>}
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteLayout, PageHero } from "@/components/site-chrome";
import { listPublishedNews, listCategories } from "@/lib/news.functions";

export const Route = createFileRoute("/actualites")({
  component: NewsIndex,
  loader: async () => ({
    items: await listPublishedNews({ data: {} }),
    categories: await listCategories(),
  }),
  head: () => {
    const title = "Actualités — SMS Pro Mobile";
    const desc = "Toutes les actualités SMS Pro Mobile : nouveautés produit, retours clients et tendances du marketing SMS en Afrique de l'Ouest.";
    const url = "https://smsmobilepro.lovable.app/actualites";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
        { property: "og:type", content: "website" },
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
              { "@type": "ListItem", position: 2, name: "Actualités", item: url },
            ],
          }),
        },
      ],
    };
  },
});

function NewsIndex() {
  const initial = Route.useLoaderData();
  const { data } = useQuery({
    queryKey: ["public-news", "all"],
    queryFn: async () => ({
      items: await listPublishedNews({ data: {} }),
      categories: await listCategories(),
    }),
    initialData: initial,
  });
  const items = data?.items ?? [];
  const categories = data?.categories ?? [];
  const allTags = Array.from(new Set(items.flatMap((n: any) => n.tags ?? []))).slice(0, 20);

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Blog"
        title="Actualités & ressources"
        description="Nouveautés produit, cas d'usage clients et bonnes pratiques SMS en Afrique de l'Ouest."
      />
      <section className="px-4 pb-20 sm:px-8">
        <div className="mx-auto max-w-6xl">
          {(categories.length > 0 || allTags.length > 0) && (
            <div className="mb-8 flex flex-wrap gap-2">
              {categories.map((c: any) => (
                <Link key={c.id} to="/actualites/categorie/$slug" params={{ slug: c.slug }} className="text-xs font-mono uppercase tracking-widest px-3 py-1.5 border border-border rounded-full hover:border-primary hover:text-primary">
                  {c.name}
                </Link>
              ))}
              {allTags.map((t) => {
                const tag = String(t);
                return (
                <Link key={tag} to="/actualites/tag/$slug" params={{ slug: tag }} className="text-xs px-3 py-1.5 bg-muted rounded-full hover:bg-primary/10 hover:text-primary">
                  #{tag}
                </Link>
              );})}

            </div>
          )}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((n: any) => (
              <Link
                key={n.id}
                to="/actualites/$slug"
                params={{ slug: n.slug }}
                className="group bg-background border border-border rounded-sm overflow-hidden hover:border-primary transition-colors"
              >
                {n.cover_image_url && (
                  <img src={n.cover_image_url} alt={n.title} loading="lazy" className="w-full aspect-[16/10] object-cover" />
                )}
                <div className="p-4">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-foreground/50">
                    {n.published_at && new Date(n.published_at).toLocaleDateString("fr-FR")}
                    {n.news_categories?.name && <> · {n.news_categories.name}</>}
                  </div>
                  <h2 className="mt-1 font-display font-bold text-lg leading-snug group-hover:text-primary">
                    {n.title}
                  </h2>
                  {n.excerpt && <p className="text-sm text-foreground/70 mt-2 line-clamp-3">{n.excerpt}</p>}
                </div>
              </Link>
            ))}
            {items.length === 0 && (
              <div className="col-span-full p-10 text-center text-foreground/50">Aucune actualité pour le moment.</div>
            )}
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}

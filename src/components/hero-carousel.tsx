import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listPublishedNews, listActiveHeroSlides } from "@/lib/news.functions";
import heroSms from "@/assets/hero-sms-1.jpg";
import heroEmail from "@/assets/hero-email-1.jpg";
import heroCedeao from "@/assets/hero-cedeao-realistic.jpg";
import heroMoney from "@/assets/hero-mobile-money.jpg";

type Slide = {
  key: string;
  src: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
  href?: string;
  cta?: string;
  duration_ms?: number;
  pause_on_hover?: boolean;
  kind?: string;
};

const DEFAULT_SLIDES: Slide[] = [
  { key: "sms", kind: "sms", src: heroSms, eyebrow: "SMS Marketing", title: "Vos promos livrées en 3 secondes", subtitle: "98,2% de délivrabilité sur les 8 pays UEMOA.", href: "/solutions", cta: "Découvrir" },
  { key: "money", kind: "money", src: heroMoney, eyebrow: "Mobile Money", title: "Alertes de paiement instantanées", subtitle: "Orange Money, MTN MoMo, Wave, Moov.", href: "/solutions", cta: "Voir les cas d'usage" },
  { key: "uemoa", kind: "uemoa", src: heroCedeao, eyebrow: "Zone CEDEAO", title: "L'Afrique de l'Ouest connectée.", subtitle: "Les marchés de la CEDEAO réunis sur une plateforme professionnelle.", href: "/tarifs", cta: "Voir les tarifs" },
  { key: "email", kind: "email", src: heroEmail, eyebrow: "Omnicanal", title: "SMS + Email + WhatsApp", subtitle: "Pilotez toutes vos campagnes depuis un seul dashboard.", href: "/solutions", cta: "Explorer" },
];

export function HeroCarousel({ context = "all" }: { context?: "all" | "sms" | "email" | "uemoa" }) {
  const { data: cmsSlides = [] } = useQuery({
    queryKey: ["hero-slides", context],
    queryFn: () => listActiveHeroSlides({ data: { context } }),
    staleTime: 60_000,
  });
  const { data: news = [] } = useQuery({
    queryKey: ["public-news-hero", context],
    queryFn: () => listPublishedNews({ data: { limit: 3 } }),
    enabled: context === "all",
    staleTime: 60_000,
  });

  const slides = useMemo<Slide[]>(() => {
    const cms: Slide[] = (cmsSlides as any[]).map((s) => ({
      key: `cms-${s.id}`,
      src: s.media_url,
      eyebrow: s.eyebrow || s.kind?.toUpperCase() || "",
      title: s.title,
      subtitle: s.subtitle || undefined,
      href: s.href || undefined,
      cta: s.cta || undefined,
      duration_ms: s.duration_ms,
      pause_on_hover: s.pause_on_hover,
      kind: s.kind
    }));
    
    const newsSlides: Slide[] = context === "all"
      ? (news as any[]).slice(0, 3).map((n) => ({
          key: `news-${n.id}`,
          src: n.cover_image_url || heroSms,
          eyebrow: "Actualité",
          title: n.title,
          subtitle: n.excerpt || undefined,
          href: `/actualites/${n.slug}`,
          cta: "Lire l'article",
          kind: "news"
        }))
      : [];

    const filteredDefaults = context !== "all"
      ? DEFAULT_SLIDES.filter((slide) => slide.kind === context)
      : DEFAULT_SLIDES;

    const merged = [...cms, ...newsSlides, ...filteredDefaults];
    // dedupe by key
    const seen = new Set<string>();
    return merged.filter((s) => (seen.has(s.key) ? false : (seen.add(s.key), true)));
  }, [cmsSlides, context, news]);

  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (paused || slides.length <= 1) return;
    const duration = slides[idx]?.duration_ms ?? 5000;
    timerRef.current = setTimeout(() => setIdx((i) => (i + 1) % slides.length), duration);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [idx, paused, slides]);

  useEffect(() => {
    if (idx >= slides.length) setIdx(0);
  }, [slides.length, idx]);

  const current = slides[idx] ?? slides[0];
  if (!current) return null;

  const anyPauseOnHover = slides.some((s) => s.pause_on_hover !== false);

  return (
    <div
      className="relative w-full aspect-[4/5] sm:aspect-square lg:aspect-[4/5] overflow-hidden rounded-sm bg-background border border-border shadow-[var(--shadow-hero)]"
      onMouseEnter={() => anyPauseOnHover && setPaused(true)}
      onMouseLeave={() => anyPauseOnHover && setPaused(false)}
    >
      {slides.map((s, i) => (
        <img
          key={s.key}
          src={s.src}
          alt={s.title}
          loading={i === 0 ? "eager" : "lazy"}
          width={s.src === heroCedeao ? 1536 : 1024}
          height={s.src === heroCedeao ? 1536 : 1024}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
            i === idx ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
      {current.kind === "uemoa" && (
        <div className="absolute top-4 left-4 max-w-[calc(100%-6rem)] rounded-sm bg-background/90 px-3 py-2 shadow-sm" aria-label="Pays de la CEDEAO">
          <div className="flex flex-wrap gap-1 text-base leading-none" title="Bénin, Burkina Faso, Cabo Verde, Côte d’Ivoire, Gambie, Ghana, Guinée, Guinée-Bissau, Liberia, Mali, Niger, Nigeria, Sénégal, Sierra Leone, Togo">
            {["🇧🇯", "🇧🇫", "🇨🇻", "🇨🇮", "🇬🇲", "🇬🇭", "🇬🇳", "🇬🇼", "🇱🇷", "🇲🇱", "🇳🇪", "🇳🇬", "🇸🇳", "🇸🇱", "🇹🇬"].map((flag) => <span key={flag}>{flag}</span>)}
          </div>
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7 text-white">
        <div className="inline-flex items-center gap-2 px-2 py-1 bg-primary/90 rounded-full mb-3">
          <span className="text-[10px] font-mono uppercase tracking-widest font-bold">
            {current.eyebrow}
          </span>
        </div>
        <h3 className="font-display font-extrabold text-xl sm:text-2xl lg:text-3xl leading-tight text-balance">
          {current.title}
        </h3>
        {current.subtitle && (
          <p className="mt-2 text-sm sm:text-base text-white/80 max-w-md">{current.subtitle}</p>
        )}
        {current.href && current.cta && (
          current.href.startsWith("http") ? (
            <a
              href={current.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-4 text-sm font-semibold border-b-2 border-white/70 hover:border-white pb-0.5"
            >
              {current.cta} →
            </a>
          ) : (
            <Link
              to={current.href as any}
              className="inline-flex items-center gap-1 mt-4 text-sm font-semibold border-b-2 border-white/70 hover:border-white pb-0.5"
            >
              {current.cta} →
            </Link>
          )
        )}
      </div>

      <div className="absolute top-4 right-4 flex gap-1.5">
        {slides.map((_, i) => (
          <button
            key={i}
            aria-label={`Aller à la diapo ${i + 1}`}
            onClick={() => setIdx(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === idx ? "w-6 bg-white" : "w-1.5 bg-white/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

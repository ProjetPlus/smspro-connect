import { createFileRoute } from "@tanstack/react-router";

/**
 * Ancienne route de connexion hébergée par un fournisseur tiers.
 * La connexion est maintenant gérée directement par le parcours /auth.
 */
export const Route = createFileRoute("/~oauth/initiate")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const incoming = new URL(request.url);
        const destination = new URL("/auth", incoming.origin);
        const redirect = incoming.searchParams.get("redirect");
        if (redirect) destination.searchParams.set("redirect", redirect);
        return Response.redirect(destination.toString(), 302);
      },
    },
  },
  component: () => null,
});

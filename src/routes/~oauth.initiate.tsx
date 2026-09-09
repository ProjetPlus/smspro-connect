import { createFileRoute } from "@tanstack/react-router";

const LOVABLE_PROJECT_ID = "05fb6c71-99a2-4423-8884-d643db6a936b";
const HOSTED_ORIGIN = "https://smsmobilepro.lovable.app";

export const Route = createFileRoute("/~oauth/initiate")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const incoming = new URL(request.url);
        const destination = new URL("https://oauth.lovable.app/initiate");

        incoming.searchParams.forEach((value, key) => {
          destination.searchParams.set(key, value);
        });

        destination.searchParams.set("project_id", LOVABLE_PROJECT_ID);

        const redirectUri = incoming.searchParams.get("redirect_uri");
        if (!redirectUri || !isLovableHostedRedirect(redirectUri)) {
          const fallback = new URL("/auth/callback", HOSTED_ORIGIN);
          fallback.searchParams.set("redirect", "/dashboard");
          destination.searchParams.set("redirect_uri", fallback.toString());
        }

        return Response.redirect(destination.toString(), 302);
      },
    },
  },
  component: () => null,
});

function isLovableHostedRedirect(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (url.hostname.endsWith(".lovable.app") || url.hostname.endsWith(".lovable.dev"));
  } catch {
    return false;
  }
}
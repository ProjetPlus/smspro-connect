import { createServerFn } from "@tanstack/react-start";
import { createPublicDataClient } from "./public-data-client";

export const listPackages = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const sb = createPublicDataClient();
    const { data, error } = await sb.from("packages").select("*").eq("active", true).order("sort_order");
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
});


export const getPackageBySlug = createServerFn({ method: "GET" })
  .validator((d: { slug: string }) => d)
  .handler(async ({ data }) => {
    const sb = createPublicDataClient();
    const { data: pkg, error } = await sb.from("packages").select("*").eq("slug", data.slug).eq("active", true).maybeSingle();
    if (error) throw error;
    return pkg;
  });

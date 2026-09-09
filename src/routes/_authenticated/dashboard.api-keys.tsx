import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard-chrome";
import { listApiKeys, createApiKey, revokeApiKey } from "@/lib/api-keys.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/api-keys")({
  component: ApiKeysPage,
  head: () => ({ meta: [{ title: "Clés API — SMS Pro Mobile" }, { name: "robots", content: "noindex" }] }),
});

function ApiKeysPage() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [secret, setSecret] = useState<string | null>(null);
  const { data: keys = [] } = useQuery({ queryKey: ["api-keys"], queryFn: () => listApiKeys() });

  const create = useMutation({
    mutationFn: () => createApiKey({ data: { name } }),
    onSuccess: (k: any) => { setSecret(k.secret); setName(""); qc.invalidateQueries({ queryKey: ["api-keys"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const revoke = useMutation({
    mutationFn: (id: string) => revokeApiKey({ data: { id } }),
    onSuccess: () => { toast.success("Clé révoquée"); qc.invalidateQueries({ queryKey: ["api-keys"] }); },
  });

  return (
    <DashboardLayout title="Clés API">
      <div className="bg-background border border-border rounded-sm p-5 mb-6">
        <h2 className="font-display font-bold mb-2">SMS Gateway API</h2>
        <p className="text-sm text-foreground/60 mb-3">Utilisez vos clés API pour envoyer des SMS directement depuis vos applications.</p>
        <pre className="bg-muted p-3 rounded-sm text-[11px] font-mono overflow-x-auto">
{`POST /api/public/v1/sms
Authorization: Bearer smspm_...
Content-Type: application/json

{ "to": "+2250700000000", "message": "Hello", "sender_id": "SMSPRO" }`}
        </pre>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="bg-background border border-border rounded-sm p-4 mb-4 flex flex-wrap gap-2">
        <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom de la clé (ex: Production)" className="flex-1 min-w-[200px] px-3 py-2 border border-border rounded-sm text-sm" />
        <button type="submit" disabled={create.isPending} className="bg-primary text-primary-foreground px-4 py-2 rounded-sm text-sm font-semibold hover:bg-primary-dark disabled:opacity-50">
          Générer une clé
        </button>
      </form>

      {secret && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-sm p-4 mb-4">
          <div className="text-xs font-mono uppercase tracking-widest text-yellow-900 mb-2">⚠ Copiez cette clé maintenant — elle ne sera plus affichée</div>
          <code className="block bg-white p-3 rounded font-mono text-sm break-all">{secret}</code>
          <button onClick={() => setSecret(null)} className="mt-2 text-xs underline">Masquer</button>
        </div>
      )}

      <div className="bg-background border border-border rounded-sm overflow-hidden">
        {keys.length === 0 && <div className="p-6 text-sm text-center text-foreground/50">Aucune clé API.</div>}
        {keys.map((k: any) => (
          <div key={k.id} className="p-4 border-b border-border last:border-b-0 flex items-center justify-between gap-3">
            <div>
              <div className="font-semibold">{k.name}</div>
              <div className="text-xs text-foreground/50 font-mono mt-1">{k.key_prefix}••••••••</div>
              <div className="text-xs text-foreground/50 mt-1">
                Créée {new Date(k.created_at).toLocaleDateString("fr-FR")}
                {k.last_used_at && ` · Utilisée ${new Date(k.last_used_at).toLocaleDateString("fr-FR")}`}
                {k.revoked_at && ` · Révoquée`}
              </div>
            </div>
            {!k.revoked_at && (
              <button onClick={() => revoke.mutate(k.id)} className="text-xs text-red-600 hover:underline">Révoquer</button>
            )}
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}

import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchRoles, type AppRole } from "@/lib/auth";
import { LogOut, Menu, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import smsProLogo from "@/assets/sms-pro-mobile-logo.png";

type NavItem = { to: string; label: string; admin?: boolean };

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Vue d'ensemble" },
  { to: "/dashboard/campaigns", label: "Campagnes" },
  { to: "/dashboard/orders", label: "Commandes" },
  { to: "/dashboard/api-keys", label: "Clés API" },
  { to: "/dashboard/settings", label: "Paramètres" },
  { to: "/admin", label: "— Admin —", admin: true },
  { to: "/admin/users", label: "Utilisateurs", admin: true },
  { to: "/admin/packages", label: "Packages", admin: true },
  { to: "/admin/pricing", label: "Paliers tarifaires", admin: true },

  { to: "/admin/orders", label: "Toutes commandes", admin: true },
  { to: "/admin/campaigns", label: "Toutes campagnes", admin: true },
  { to: "/admin/contacts", label: "Messages contact", admin: true },
  { to: "/admin/news", label: "Actualités (CMS)", admin: true },
  { to: "/admin/news-categories", label: "Catégories & tags", admin: true },
  { to: "/admin/hero", label: "Carousel Hero", admin: true },
  { to: "/admin/signups", label: "Dossiers d'inscription", admin: true },
  { to: "/admin/notifications", label: "Notifications", admin: true },
  { to: "/admin/settings", label: "Paramètres système", admin: true },

];


export function DashboardLayout({ children, title }: { children: React.ReactNode; title: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [email, setEmail] = useState<string>("");
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [open, setOpen] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        setEmail(data.user.email ?? "");
        setRoles(await fetchRoles(data.user.id));
      }
    });
  }, []);

  async function handleSignOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const isAdmin = roles.includes("admin");
  const items = NAV.filter((n) => !n.admin || isAdmin);

  return (
    <div className="min-h-screen bg-muted flex flex-col">
      <header className="bg-background border-b border-border sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 sm:px-8 py-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <Link to="/dashboard" className="flex min-w-0 flex-col leading-none">
            <img src={smsProLogo} alt="SMS Pro Mobile" className="h-8 w-auto object-contain" />
            <span className="text-[10px] font-mono tracking-widest text-foreground/50 uppercase">
              {isAdmin ? "Admin" : "Espace client"}
            </span>
          </Link>
          <div className="flex min-w-0 items-center justify-end gap-2 sm:gap-3">
            <span className="hidden sm:inline text-xs font-mono text-foreground/60 truncate max-w-[200px]">{email}</span>
            <button onClick={handleSignOut} className="p-2 rounded-sm border border-border hover:bg-muted" aria-label="Déconnexion">
              <LogOut className="h-4 w-4" />
            </button>
            <button onClick={() => setOpen((v) => !v)} className="md:hidden p-2 rounded-sm border border-border" aria-label="Menu">
              {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

       <div className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-8 py-6 grid md:grid-cols-[220px_minmax(0,1fr)] gap-6">
        <aside className={(open ? "block" : "hidden") + " md:block"}>
          <nav className="bg-background border border-border rounded-sm p-2 sticky top-20">
            {items.map((n) => {
              const active = path === n.to || (n.to !== "/dashboard" && path.startsWith(n.to));
              return (
                <Link
                  key={n.to}
                  to={n.to as any}
                  onClick={() => setOpen(false)}
                  className={`block px-3 py-2 text-sm rounded-sm font-semibold ${
                    active ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  }`}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="min-w-0">
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold mb-6">{title}</h1>
          {children}
        </main>
      </div>
    </div>
  );
}

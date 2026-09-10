import { useEffect, useRef, useState } from "react";
import { X, Send } from "lucide-react";
import { askPatcoFn, getPatcoHistory } from "@/lib/patco.functions";
import patcoAvatar from "@/assets/patco-avatar.png.asset.json";

type Msg = { role: "user" | "assistant"; content: string };

const SESSION_KEY = "patco_session_id";
const WELCOME =
  "Bonjour 👋 Je suis Patco, l'assistant de SMS Pro Mobile. Comment puis-je vous aider : tarifs, création de compte, campagnes SMS ?";

function getSessionId() {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function PatcoAssistant() {
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [messages, setMessages] = useState<Msg[]>([{ role: "assistant", content: WELCOME }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setSessionId(getSessionId());
  }, []);

  useEffect(() => {
    if (!open || !sessionId) return;
    field.current?.focus();
    void getPatcoHistory({ data: { session_id: sessionId } }).then((r) => {
      if (r.messages.length) setMessages(r.messages as Msg[]);
    });
  }, [open, sessionId]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  async function send() {
    const text = input.trim();
    if (!text || busy || !sessionId) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setBusy(true);
    try {
      const r = await askPatcoFn({ data: { session_id: sessionId, message: text } });
      setMessages((m) => [...m, { role: "assistant", content: r.reply }]);
    } catch (e: any) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: e?.message ?? "Une erreur est survenue. Réessayez dans un instant." },
      ]);
    } finally {
      setBusy(false);
      field.current?.focus();
    }
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Ouvrir l'assistant Patco"
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-background/95 backdrop-blur border border-border shadow-lg pl-1.5 pr-4 py-1.5 hover:border-primary transition-colors"
        >
          <img
            src={patcoAvatar.url}
            alt="Patco, assistante virtuelle SMS Pro Mobile"
            className="h-11 w-11 rounded-full object-cover ring-2 ring-primary"
          />
          <span className="text-left leading-tight">
            <span className="block text-sm font-bold">Patco</span>
            <span className="block text-[10px] font-mono uppercase tracking-wider text-foreground/50">
              Assistant en ligne
            </span>
          </span>
          <span className="absolute left-9 bottom-2 h-3 w-3 rounded-full bg-green-500 ring-2 ring-background" />
        </button>
      )}

      {open && (
        <div className="fixed bottom-5 right-5 z-50 w-[min(24rem,calc(100vw-2.5rem))] h-[min(32rem,calc(100vh-6rem))] flex flex-col rounded-lg border border-border bg-background shadow-2xl overflow-hidden">
          <header className="flex items-center gap-3 p-3 border-b border-border bg-muted">
            <img src={patcoAvatar.url} alt="" className="h-9 w-9 rounded-full object-cover ring-2 ring-primary" />
            <div className="flex-1 leading-tight">
              <div className="text-sm font-bold">Patco</div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-foreground/50">
                Assistant SMS Pro Mobile
              </div>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Fermer" className="p-1 rounded hover:bg-background">
              <X className="h-4 w-4" />
            </button>
          </header>

          <div ref={scroller} className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex gap-2"}>
                {m.role === "assistant" && (
                  <img src={patcoAvatar.url} alt="" className="h-6 w-6 rounded-full object-cover mt-0.5 shrink-0" />
                )}
                <div
                  className={
                    m.role === "user"
                      ? "max-w-[80%] rounded-lg bg-primary text-primary-foreground px-3 py-2 text-sm whitespace-pre-wrap"
                      : "max-w-[85%] text-sm text-foreground whitespace-pre-wrap"
                  }
                >
                  {m.content}
                </div>
              </div>
            ))}
            {busy && <div className="text-xs text-foreground/50 animate-pulse pl-8">Patco écrit…</div>}
          </div>

          <div className="border-t border-border p-2 flex items-end gap-2">
            <textarea
              ref={field}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              rows={2}
              placeholder="Votre question…"
              className="flex-1 resize-none px-3 py-2 text-sm border border-border rounded-sm bg-background"
            />
            <button
              type="button"
              onClick={() => void send()}
              disabled={busy || !input.trim()}
              aria-label="Envoyer"
              className="h-9 w-9 shrink-0 flex items-center justify-center rounded-sm bg-primary text-primary-foreground disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

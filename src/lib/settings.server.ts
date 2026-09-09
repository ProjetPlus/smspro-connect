// Server-only access to the system_settings table.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type MockSettings = { sms: boolean; payments: boolean };

const DEFAULTS: MockSettings = { sms: false, payments: false };

export async function readMockSettings(): Promise<MockSettings> {
  try {
    const { data } = await supabaseAdmin
      .from("system_settings")
      .select("value")
      .eq("key", "mock_mode")
      .maybeSingle();
    const v = (data?.value ?? {}) as Partial<MockSettings>;
    return {
      sms: process.env['SMS_MOCK_MODE'] === "true" ? true : v.sms === true,
      payments: process.env['PAYMENTS_MOCK_MODE'] === "true" ? true : v.payments === true,
    };
  } catch {
    return DEFAULTS;
  }
}

export async function writeMockSettings(next: MockSettings): Promise<MockSettings> {
  await supabaseAdmin
    .from("system_settings")
    .upsert({ key: "mock_mode", value: next as unknown as Record<string, boolean> }, { onConflict: "key" });
  return next;
}

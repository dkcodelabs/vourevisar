import { supabase } from "@/integrations/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";

type AdminRpcArgs = Record<string, unknown>;

type AdminRpcResponse<T> = {
  data?: T;
  error?: string;
  code?: string;
};

export async function invokeAdminRpc<T = unknown>(
  action: string,
  args: AdminRpcArgs = {},
): Promise<T> {
  const { data, error } = await supabase.functions.invoke<AdminRpcResponse<T>>("admin-rpc", {
    body: { action, args },
  });

  if (error instanceof FunctionsHttpError) {
    const body = await error.context.json().catch(() => null) as {
      error?: string;
      code?: string;
    } | null;

    if (body?.error) {
      throw new Error(body.code ? `${body.error} (código ${body.code})` : body.error);
    }
  }
  if (error) throw error;
  if (data?.error) throw new Error(data.error);

  return data?.data as T;
}

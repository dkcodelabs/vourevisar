import { supabase } from "@/integrations/supabase/client";

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

  if (error) throw error;
  if (data?.error) throw new Error(data.error);

  return data?.data as T;
}

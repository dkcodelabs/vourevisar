import { supabase } from "@/integrations/supabase/client";

type UserRpcArgs = Record<string, unknown>;

type UserRpcResponse<T> = {
  data?: T;
  error?: string;
  code?: string;
};

export async function invokeUserRpc<T = unknown>(
  action: string,
  args: UserRpcArgs = {},
): Promise<T> {
  const { data, error } = await supabase.functions.invoke<UserRpcResponse<T>>("user-rpc", {
    body: { action, args },
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);

  return data?.data as T;
}

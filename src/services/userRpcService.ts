import { supabase } from "@/integrations/supabase/client";
import { withTimeout } from "@/utils/withTimeout";

type UserRpcArgs = Record<string, unknown>;

type UserRpcResponse<T> = {
  data?: T;
  error?: string;
  code?: string;
};

export async function invokeUserRpc<T = unknown>(
  action: string,
  args: UserRpcArgs = {},
  accessToken?: string | null,
): Promise<T> {
  const { data, error } = await withTimeout(
    supabase.functions.invoke<UserRpcResponse<T>>("user-rpc", {
      body: { action, args },
      ...(accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {}),
    }),
    10000,
    'O servidor demorou para responder. Tente novamente.',
  );

  if (error) throw error;
  if (data?.error) throw new Error(data.error);

  return data?.data as T;
}

-- The completion RPC runs as service_role through the trusted Edge Function.
-- It must be able to persist answer keys in the private schema, while browser
-- roles remain unable to read or write this table.

grant insert on table private.practice_item_answers to service_role;

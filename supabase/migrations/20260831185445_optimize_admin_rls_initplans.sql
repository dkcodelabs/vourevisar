-- Performance-only update: every policy keeps its command, role and predicate.
ALTER POLICY "Authenticated users can insert alerts" ON public.admin_alert_events WITH CHECK ((SELECT auth.uid()) IS NOT NULL);
ALTER POLICY "Only owners and admins can update alerts" ON public.admin_alert_events USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = (SELECT auth.uid()) AND user_roles.role = ANY (ARRAY['owner'::app_role, 'admin'::app_role])));
ALTER POLICY "Only owners and admins can view alerts" ON public.admin_alert_events USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = (SELECT auth.uid()) AND user_roles.role = ANY (ARRAY['owner'::app_role, 'admin'::app_role])));

ALTER POLICY "Authenticated users can insert error logs" ON public.admin_error_events WITH CHECK ((SELECT auth.uid()) IS NOT NULL);
ALTER POLICY "Only owners and admins can update errors" ON public.admin_error_events USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = (SELECT auth.uid()) AND user_roles.role = ANY (ARRAY['owner'::app_role, 'admin'::app_role])));
ALTER POLICY "Only owners and admins can view errors" ON public.admin_error_events USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = (SELECT auth.uid()) AND user_roles.role = ANY (ARRAY['owner'::app_role, 'admin'::app_role])));

ALTER POLICY "Admins can manage ai_error_logs" ON public.ai_error_logs USING (private.has_role_or_higher((SELECT auth.uid()), 'admin'::app_role)) WITH CHECK (private.has_role_or_higher((SELECT auth.uid()), 'admin'::app_role));
ALTER POLICY "Admins can view ai_error_logs" ON public.ai_error_logs USING (private.has_role_or_higher((SELECT auth.uid()), 'admin'::app_role));
ALTER POLICY "Admins can manage ai_status" ON public.ai_status USING (private.has_role_or_higher((SELECT auth.uid()), 'admin'::app_role)) WITH CHECK (private.has_role_or_higher((SELECT auth.uid()), 'admin'::app_role));
ALTER POLICY "Admins can view ai_status" ON public.ai_status USING (private.has_role_or_higher((SELECT auth.uid()), 'admin'::app_role));
ALTER POLICY "Admins can manage all AI usage logs" ON public.ai_usage_logs USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = (SELECT auth.uid()) AND user_roles.role = ANY (ARRAY['admin'::app_role, 'owner'::app_role])));

ALTER POLICY "Admins can view audit logs" ON public.audit_logs USING (private.has_role((SELECT auth.uid()), 'owner'::app_role) OR private.has_role((SELECT auth.uid()), 'admin'::app_role));
ALTER POLICY "System can insert logs" ON public.audit_logs WITH CHECK ((SELECT auth.uid()) IS NOT NULL);
ALTER POLICY "Moderators can manage comments" ON public.comments USING (private.has_role_or_higher((SELECT auth.uid()), 'moderator'::app_role));

ALTER POLICY "Admins can manage coupon uses" ON public.coupon_uses USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = (SELECT auth.uid()) AND user_roles.role = ANY (ARRAY['admin'::app_role, 'owner'::app_role])));
ALTER POLICY "Users can view own coupon uses" ON public.coupon_uses USING ((SELECT auth.uid()) = user_id);
ALTER POLICY "Admins can manage all coupons" ON public.coupons USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = (SELECT auth.uid()) AND user_roles.role = ANY (ARRAY['admin'::app_role, 'owner'::app_role])));

ALTER POLICY "Members can view organization membership" ON public.organization_members USING (user_id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = organization_members.organization_id AND om.user_id = (SELECT auth.uid())));
ALTER POLICY "Organization owners can manage members" ON public.organization_members USING (EXISTS (SELECT 1 FROM organizations o WHERE o.id = organization_members.organization_id AND o.owner_id = (SELECT auth.uid())));
ALTER POLICY "Members can view their organizations" ON public.organizations USING (EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = organizations.id AND om.user_id = (SELECT auth.uid())));
ALTER POLICY "Owners can manage their organizations" ON public.organizations USING (owner_id = (SELECT auth.uid()));
ALTER POLICY "System admins can manage all organizations" ON public.organizations USING (private.has_role_or_higher((SELECT auth.uid()), 'admin'::app_role));

ALTER POLICY "Owner can manage plan configs" ON public.plan_configs USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = (SELECT auth.uid()) AND user_roles.role = 'owner'::app_role));
ALTER POLICY "Admins can manage all posts" ON public.posts USING (private.has_role_or_higher((SELECT auth.uid()), 'admin'::app_role));
ALTER POLICY "Moderators can manage flagged posts" ON public.posts USING (private.has_role_or_higher((SELECT auth.uid()), 'moderator'::app_role) AND status = 'flagged'::text);

ALTER POLICY "Admins can update any profile" ON public.profiles USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = ANY (ARRAY['admin'::app_role, 'owner'::app_role])));
ALTER POLICY "Admins can view all profiles" ON public.profiles USING (private.has_role_or_higher((SELECT auth.uid()), 'admin'::app_role));
ALTER POLICY "Users can insert their own profile" ON public.profiles WITH CHECK ((SELECT auth.uid()) = id);
ALTER POLICY "Users can manage own profile" ON public.profiles USING (id = (SELECT auth.uid()));
ALTER POLICY "Users can update their own profile" ON public.profiles USING ((SELECT auth.uid()) = id) WITH CHECK ((SELECT auth.uid()) = id);
ALTER POLICY "Users can view own profile" ON public.profiles USING (id = (SELECT auth.uid()));

ALTER POLICY "Owners can manage system settings" ON public.system_settings USING (private.is_owner((SELECT auth.uid())));
ALTER POLICY "Admins can update all feedback" ON public.user_feedback_events USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = ANY (ARRAY['admin'::app_role, 'owner'::app_role]))) WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = ANY (ARRAY['admin'::app_role, 'owner'::app_role])));
ALTER POLICY "Admins can view all feedback" ON public.user_feedback_events USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = ANY (ARRAY['admin'::app_role, 'owner'::app_role])));

-- Fresh Supabase projects can omit `realtime.messages` until Realtime is
-- configured. Production already has this policy; a clean bootstrap must not
-- fail merely because the optional internal relation is absent.
DO $$
BEGIN
  IF to_regclass('realtime.messages') IS NOT NULL THEN
    EXECUTE $policy$
      ALTER POLICY "Authenticated users can subscribe to own topics"
      ON realtime.messages
      USING (((SELECT auth.uid()) IS NOT NULL) AND realtime.topic() ~~ (('%'::text || ((SELECT auth.uid()))::text) || '%'::text))
    $policy$;
  END IF;
END $$;

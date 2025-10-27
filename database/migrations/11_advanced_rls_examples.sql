-- =====================================================
-- 11. EXEMPLOS AVANÇADOS DE RLS POLICIES
-- =====================================================
-- Casos de uso mais complexos com diferentes níveis de acesso

-- =====================================================
-- A) TABELA DE POSTS/CONTEÚDO COM MODERAÇÃO
-- =====================================================
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  status TEXT DEFAULT 'draft', -- draft, published, archived, flagged
  visibility TEXT DEFAULT 'public', -- public, private, unlisted
  tags TEXT[],
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  published_at TIMESTAMP WITH TIME ZONE
);

-- Índices
CREATE INDEX idx_posts_author_id ON public.posts(author_id);
CREATE INDEX idx_posts_status ON public.posts(status);
CREATE INDEX idx_posts_visibility ON public.posts(visibility);
CREATE INDEX idx_posts_published_at ON public.posts(published_at DESC);
CREATE INDEX idx_posts_tags ON public.posts USING GIN(tags);

-- Habilita RLS
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Policy 1: Qualquer um pode ver posts públicos e publicados
CREATE POLICY "Anyone can view published public posts" 
ON public.posts 
FOR SELECT 
USING (
  status = 'published' AND 
  visibility = 'public'
);

-- Policy 2: Autores podem gerenciar próprios posts
CREATE POLICY "Authors can manage own posts" 
ON public.posts 
FOR ALL 
USING (author_id = auth.uid());

-- Policy 3: Moderadores podem ver e editar posts flagged
CREATE POLICY "Moderators can manage flagged posts" 
ON public.posts 
FOR ALL 
USING (
  public.has_role_or_higher(auth.uid(), 'moderator') AND 
  status = 'flagged'
);

-- Policy 4: Admins podem ver e gerenciar todos os posts
CREATE POLICY "Admins can manage all posts" 
ON public.posts 
FOR ALL 
USING (public.has_role_or_higher(auth.uid(), 'admin'));

-- =====================================================
-- B) TABELA DE COMENTÁRIOS COM HIERARQUIA
-- =====================================================
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES auth.users(id) NOT NULL,
  parent_id UUID REFERENCES public.comments(id), -- Para replies
  content TEXT NOT NULL,
  status TEXT DEFAULT 'published', -- published, hidden, flagged, deleted
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices
CREATE INDEX idx_comments_post_id ON public.comments(post_id);
CREATE INDEX idx_comments_author_id ON public.comments(author_id);
CREATE INDEX idx_comments_parent_id ON public.comments(parent_id);
CREATE INDEX idx_comments_status ON public.comments(status);

-- Habilita RLS
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Policy 1: Ver comentários publicados em posts visíveis
CREATE POLICY "View published comments on visible posts" 
ON public.comments 
FOR SELECT 
USING (
  status = 'published' AND 
  EXISTS (
    SELECT 1 FROM public.posts p 
    WHERE p.id = post_id 
    AND p.status = 'published' 
    AND p.visibility = 'public'
  )
);

-- Policy 2: Autores podem gerenciar próprios comentários
CREATE POLICY "Authors can manage own comments" 
ON public.comments 
FOR ALL 
USING (author_id = auth.uid());

-- Policy 3: Moderadores podem gerenciar comentários
CREATE POLICY "Moderators can manage comments" 
ON public.comments 
FOR ALL 
USING (public.has_role_or_higher(auth.uid(), 'moderator'));

-- =====================================================
-- C) TABELA DE ORGANIZAÇÕES/EQUIPES
-- =====================================================
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES auth.users(id) NOT NULL,
  is_public BOOLEAN DEFAULT false,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member', -- owner, admin, member, viewer
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- Índices
CREATE INDEX idx_organizations_owner_id ON public.organizations(owner_id);
CREATE INDEX idx_organizations_slug ON public.organizations(slug);
CREATE INDEX idx_org_members_org_id ON public.organization_members(organization_id);
CREATE INDEX idx_org_members_user_id ON public.organization_members(user_id);

-- Habilita RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Policies para organizations
CREATE POLICY "View public organizations" 
ON public.organizations 
FOR SELECT 
USING (is_public = true);

CREATE POLICY "Members can view their organizations" 
ON public.organizations 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om 
    WHERE om.organization_id = id 
    AND om.user_id = auth.uid()
  )
);

CREATE POLICY "Owners can manage their organizations" 
ON public.organizations 
FOR ALL 
USING (owner_id = auth.uid());

CREATE POLICY "System admins can manage all organizations" 
ON public.organizations 
FOR ALL 
USING (public.has_role_or_higher(auth.uid(), 'admin'));

-- Policies para organization_members
CREATE POLICY "Members can view organization membership" 
ON public.organization_members 
FOR SELECT 
USING (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.organization_members om 
    WHERE om.organization_id = organization_id 
    AND om.user_id = auth.uid()
  )
);

CREATE POLICY "Organization owners can manage members" 
ON public.organization_members 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.organizations o 
    WHERE o.id = organization_id 
    AND o.owner_id = auth.uid()
  )
);

-- =====================================================
-- D) FUNÇÃO HELPER PARA VERIFICAR MEMBERSHIP
-- =====================================================
CREATE OR REPLACE FUNCTION public.is_organization_member(
  _org_id UUID, 
  _user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members 
    WHERE organization_id = _org_id 
    AND user_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.get_organization_role(
  _org_id UUID, 
  _user_id UUID DEFAULT auth.uid()
)
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.organization_members 
  WHERE organization_id = _org_id 
  AND user_id = _user_id
$$;

-- =====================================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================

COMMENT ON TABLE public.posts IS 
'Sistema de posts com moderação. Diferentes níveis de acesso baseados em role e status do conteúdo.';

COMMENT ON TABLE public.comments IS 
'Comentários hierárquicos. Visibilidade baseada no post pai e moderação por roles.';

COMMENT ON TABLE public.organizations IS 
'Sistema de organizações/equipes. Owners gerenciam, membros acessam, público vê organizações públicas.';

COMMENT ON FUNCTION public.is_organization_member(UUID, UUID) IS 
'Verifica se usuário é membro de uma organização. Usado em policies complexas.';

COMMENT ON FUNCTION public.get_organization_role(UUID, UUID) IS 
'Retorna a role do usuário em uma organização específica.';
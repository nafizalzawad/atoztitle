
-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'bd_user');
CREATE TYPE public.client_source AS ENUM ('event', 'referral', 'direct_client', 'non_direct_client', 'social_media', 'other');
CREATE TYPE public.social_channel AS ENUM ('linkedin', 'facebook', 'instagram', 'other');
CREATE TYPE public.profession_type AS ENUM ('agent', 'lender', 'attorney', 'builder', 'other');
CREATE TYPE public.crm_stage AS ENUM ('lead', 'warm_lead', 'prospect', 'warm_prospect', 'client', 'active_client');
CREATE TYPE public.event_type AS ENUM ('type_1', 'type_2', 'type_3');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles table (separate from profiles per security requirements)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Contacts table
CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bd_user_id UUID NOT NULL REFERENCES auth.users(id),
  source client_source NOT NULL,
  referral_by TEXT,
  social_channel social_channel,
  source_other TEXT,
  profession profession_type,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  company TEXT,
  parent_company TEXT,
  screenshot_url TEXT,
  intent TEXT NOT NULL,
  stage crm_stage NOT NULL DEFAULT 'lead',
  engagement_points INTEGER NOT NULL DEFAULT 0,
  warm_prospect_started_at TIMESTAMPTZ,
  warm_prospect_reason TEXT,
  is_dnc BOOLEAN NOT NULL DEFAULT false,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Follow-ups table
CREATE TABLE public.follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  bd_user_id UUID NOT NULL REFERENCES auth.users(id),
  follow_up_date DATE NOT NULL,
  follow_up_time TIME,
  reminder_offset TEXT,
  notes TEXT,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;

-- Warm lead events
CREATE TABLE public.warm_lead_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  where_we_met TEXT NOT NULL,
  event_type event_type NOT NULL,
  event_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.warm_lead_events ENABLE ROW LEVEL SECURITY;

-- Expenses
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Deals
CREATE TABLE public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  bd_user_id UUID NOT NULL REFERENCES auth.users(id),
  deal_value NUMERIC(12,2) NOT NULL,
  deal_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

-- Audit log
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'bd_user');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies

-- Profiles: users see own, admins see all
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- User roles: users can read own, admins read all
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Contacts: BD sees own, admins see all
CREATE POLICY "BD users can view own contacts" ON public.contacts FOR SELECT USING (auth.uid() = bd_user_id AND is_deleted = false);
CREATE POLICY "Admins can view all contacts" ON public.contacts FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "BD users can create contacts" ON public.contacts FOR INSERT WITH CHECK (auth.uid() = bd_user_id);
CREATE POLICY "BD users can update own contacts" ON public.contacts FOR UPDATE USING (auth.uid() = bd_user_id);
CREATE POLICY "Admins can update all contacts" ON public.contacts FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete contacts" ON public.contacts FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Follow-ups
CREATE POLICY "BD users can view own follow-ups" ON public.follow_ups FOR SELECT USING (auth.uid() = bd_user_id);
CREATE POLICY "Admins can view all follow-ups" ON public.follow_ups FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "BD users can create follow-ups" ON public.follow_ups FOR INSERT WITH CHECK (auth.uid() = bd_user_id);
CREATE POLICY "BD users can update own follow-ups" ON public.follow_ups FOR UPDATE USING (auth.uid() = bd_user_id);
CREATE POLICY "Admins can manage all follow-ups" ON public.follow_ups FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Warm lead events
CREATE POLICY "BD users can view own warm lead events" ON public.warm_lead_events FOR SELECT USING (EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = contact_id AND c.bd_user_id = auth.uid()));
CREATE POLICY "Admins can view all warm lead events" ON public.warm_lead_events FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "BD users can create warm lead events" ON public.warm_lead_events FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = contact_id AND c.bd_user_id = auth.uid()));

-- Expenses
CREATE POLICY "BD users can view own expenses" ON public.expenses FOR SELECT USING (EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = contact_id AND c.bd_user_id = auth.uid()));
CREATE POLICY "Admins can view all expenses" ON public.expenses FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "BD users can create expenses" ON public.expenses FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = contact_id AND c.bd_user_id = auth.uid()));

-- Deals
CREATE POLICY "BD users can view own deals" ON public.deals FOR SELECT USING (auth.uid() = bd_user_id);
CREATE POLICY "Admins can view all deals" ON public.deals FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "BD users can create deals" ON public.deals FOR INSERT WITH CHECK (auth.uid() = bd_user_id);
CREATE POLICY "Admins can manage deals" ON public.deals FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Audit logs: admins only
CREATE POLICY "Admins can view audit logs" ON public.audit_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated users can create audit logs" ON public.audit_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Storage bucket for screenshots
INSERT INTO storage.buckets (id, name, public) VALUES ('screenshots', 'screenshots', true);
CREATE POLICY "Users can upload screenshots" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'screenshots' AND auth.role() = 'authenticated');
CREATE POLICY "Anyone can view screenshots" ON storage.objects FOR SELECT USING (bucket_id = 'screenshots');

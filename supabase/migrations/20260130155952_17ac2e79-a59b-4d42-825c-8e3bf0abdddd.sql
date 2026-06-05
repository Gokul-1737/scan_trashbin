-- Create enum for app roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create enum for waste types
CREATE TYPE public.waste_type AS ENUM ('wet', 'dry', 'plastic', 'metal', 'glass', 'ewaste');

-- Create enum for reward types
CREATE TYPE public.reward_type AS ENUM ('cash', 'coupon', 'gift');

-- Create enum for request status
CREATE TYPE public.request_status AS ENUM ('pending', 'approved', 'rejected');

-- Create user_roles table (for secure role management)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create profiles table (for user information)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  total_points INTEGER NOT NULL DEFAULT 0,
  is_blocked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create waste_types table (configurable waste categories)
CREATE TABLE public.waste_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  type waste_type NOT NULL,
  points_per_kg INTEGER NOT NULL DEFAULT 10,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bins table
CREATE TABLE public.bins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bin_id TEXT NOT NULL UNIQUE,
  bin_name TEXT NOT NULL,
  location TEXT,
  status BOOLEAN NOT NULL DEFAULT true,
  total_waste_collected DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create waste_logs table
CREATE TABLE public.waste_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  bin_id UUID REFERENCES public.bins(id) ON DELETE SET NULL,
  waste_type_id UUID REFERENCES public.waste_types(id) ON DELETE SET NULL,
  weight_kg DECIMAL(10,2) NOT NULL,
  points_earned INTEGER NOT NULL,
  qr_code TEXT,
  qr_used_at TIMESTAMP WITH TIME ZONE,
  is_valid BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create rewards table
CREATE TABLE public.rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reward_name TEXT NOT NULL,
  description TEXT,
  reward_type reward_type NOT NULL,
  points_required INTEGER NOT NULL,
  stock INTEGER,
  image_url TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reward_requests table
CREATE TABLE public.reward_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reward_id UUID REFERENCES public.rewards(id) ON DELETE CASCADE NOT NULL,
  points_used INTEGER NOT NULL,
  status request_status NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create qr_transactions table
CREATE TABLE public.qr_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  bin_id UUID REFERENCES public.bins(id) ON DELETE SET NULL,
  waste_log_id UUID REFERENCES public.waste_logs(id) ON DELETE SET NULL,
  is_valid BOOLEAN NOT NULL DEFAULT true,
  scanned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_duplicate BOOLEAN NOT NULL DEFAULT false,
  fraud_flagged BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create app_settings table
CREATE TABLE public.app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create bonus_days table
CREATE TABLE public.bonus_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  date DATE NOT NULL,
  multiplier DECIMAL(3,2) NOT NULL DEFAULT 2.0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waste_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waste_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bonus_days ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get current user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.credit_waste_qr_scan(
  p_user_id uuid,
  p_qr_code text,
  p_waste_name text,
  p_points integer,
  p_weight_kg numeric DEFAULT 1,
  p_bin_id uuid DEFAULT NULL,
  p_expires_at timestamp with time zone DEFAULT (now() + interval '60 seconds')
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_waste_type_id uuid;
  v_waste_log_id uuid;
  v_transaction_id uuid;
  v_total_points integer;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'User mismatch';
  END IF;

  IF p_points IS NULL OR p_points <= 0 THEN
    RAISE EXCEPTION 'Points must be greater than zero';
  END IF;

  IF p_waste_name IS NULL OR length(trim(p_waste_name)) = 0 THEN
    RAISE EXCEPTION 'Waste name is required';
  END IF;

  SELECT id
  INTO v_waste_type_id
  FROM public.waste_types
  WHERE lower(name) = lower(trim(p_waste_name))
  LIMIT 1;

  INSERT INTO public.waste_logs (
    user_id,
    bin_id,
    waste_type_id,
    weight_kg,
    points_earned,
    qr_code,
    qr_used_at,
    is_valid
  )
  VALUES (
    p_user_id,
    p_bin_id,
    v_waste_type_id,
    COALESCE(p_weight_kg, 1),
    p_points,
    p_qr_code,
    now(),
    true
  )
  RETURNING id INTO v_waste_log_id;

  INSERT INTO public.qr_transactions (
    qr_code,
    user_id,
    bin_id,
    waste_log_id,
    is_valid,
    scanned_at,
    expires_at,
    is_duplicate,
    fraud_flagged
  )
  VALUES (
    p_qr_code,
    p_user_id,
    p_bin_id,
    v_waste_log_id,
    true,
    now(),
    p_expires_at,
    false,
    false
  )
  RETURNING id INTO v_transaction_id;

  UPDATE public.profiles
  SET total_points = COALESCE(total_points, 0) + p_points,
      updated_at = now()
  WHERE user_id = p_user_id
  RETURNING total_points INTO v_total_points;

  IF v_total_points IS NULL THEN
    INSERT INTO public.profiles (user_id, total_points)
    VALUES (p_user_id, p_points)
    RETURNING total_points INTO v_total_points;
  END IF;

  RETURN jsonb_build_object(
    'transaction_id', v_transaction_id,
    'waste_log_id', v_waste_log_id,
    'total_points', v_total_points,
    'points_earned', p_points,
    'waste_name', p_waste_name,
    'message', 'Points credited successfully'
  );
END;
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view own role" ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all profiles" ON public.profiles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for waste_types (public read, admin write)
CREATE POLICY "Anyone can view waste types" ON public.waste_types
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage waste types" ON public.waste_types
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for bins (public read, admin write)
CREATE POLICY "Anyone can view bins" ON public.bins
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage bins" ON public.bins
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for waste_logs
CREATE POLICY "Users can view own waste logs" ON public.waste_logs
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own waste logs" ON public.waste_logs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all waste logs" ON public.waste_logs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for rewards (public read, admin write)
CREATE POLICY "Anyone can view rewards" ON public.rewards
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage rewards" ON public.rewards
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for reward_requests
CREATE POLICY "Users can view own requests" ON public.reward_requests
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own requests" ON public.reward_requests
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all requests" ON public.reward_requests
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for qr_transactions
CREATE POLICY "Users can view own transactions" ON public.qr_transactions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all transactions" ON public.qr_transactions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for app_settings (admin only)
CREATE POLICY "Admins can manage settings" ON public.app_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for bonus_days
CREATE POLICY "Anyone can view bonus days" ON public.bonus_days
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage bonus days" ON public.bonus_days
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger for updating timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add update triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_waste_types_updated_at BEFORE UPDATE ON public.waste_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bins_updated_at BEFORE UPDATE ON public.bins
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rewards_updated_at BEFORE UPDATE ON public.rewards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_app_settings_updated_at BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert default app settings
INSERT INTO public.app_settings (setting_key, setting_value, description) VALUES
  ('points_to_money_ratio', '10', 'Points required for ₹1'),
  ('qr_expiration_seconds', '30', 'QR code expiration time in seconds'),
  ('leaderboard_enabled', 'true', 'Enable/disable public leaderboard'),
  ('notifications_enabled', 'true', 'Enable/disable push notifications');

-- Insert default waste types
INSERT INTO public.waste_types (name, type, points_per_kg, icon) VALUES
  ('Wet Waste', 'wet', 5, '🍂'),
  ('Dry Waste', 'dry', 8, '📦'),
  ('Plastic', 'plastic', 15, '♻️'),
  ('Metal', 'metal', 20, '🔩'),
  ('Glass', 'glass', 12, '🫙'),
  ('E-Waste', 'ewaste', 25, '📱');
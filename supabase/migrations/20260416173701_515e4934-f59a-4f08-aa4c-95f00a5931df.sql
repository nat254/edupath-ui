CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta JSONB := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_national_id TEXT := COALESCE(meta->>'national_id', NEW.id::text);
  v_role public.app_role := COALESCE((meta->>'role')::public.app_role, 'learner'::public.app_role);
BEGIN
  INSERT INTO public.profiles (user_id, name, email, national_id, organization, county)
  VALUES (
    NEW.id,
    COALESCE(meta->>'name', ''),
    COALESCE(meta->>'contact_email', NEW.email),
    v_national_id,
    meta->>'organization',
    meta->>'county'
  )
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Auto-promote the demo admin national ID
  IF v_national_id = '1234' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;
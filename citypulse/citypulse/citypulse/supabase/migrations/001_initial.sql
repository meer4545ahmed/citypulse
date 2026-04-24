CREATE TABLE city_metrics (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  zone_id text NOT NULL,
  metric_type text NOT NULL,
  value float8 NOT NULL,
  severity text NOT NULL DEFAULT 'low',
  lat float8,
  lng float8,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE alerts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_type text NOT NULL,
  zone_id text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  is_active boolean DEFAULT true,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE policy_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  query text NOT NULL,
  ai_response text NOT NULL,
  module text,
  context_snapshot jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE city_score_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  score float8 NOT NULL,
  traffic_score float8,
  energy_score float8,
  water_score float8,
  air_score float8,
  waste_score float8,
  transport_score float8,
  recorded_at timestamptz DEFAULT now()
);

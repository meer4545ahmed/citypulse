ALTER TABLE alerts
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{"thanks":0,"no_thanks":0,"status":"pending","category":"general"}';

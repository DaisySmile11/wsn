-- Alerts/Thresholds schema for WSN project
-- Run this in your Render Postgres AFTER your existing sensor_readings table exists.

CREATE TABLE IF NOT EXISTS alert_thresholds (
  id SERIAL PRIMARY KEY,
  salinity_high_ppt REAL NOT NULL DEFAULT 4.0,
  ph_low REAL NOT NULL DEFAULT 6.5,
  ph_high REAL NOT NULL DEFAULT 8.5,
  battery_low_pct REAL NOT NULL DEFAULT 20.0,
  no_data_minutes INTEGER NOT NULL DEFAULT 10,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO alert_thresholds (salinity_high_ppt, ph_low, ph_high, battery_low_pct, no_data_minutes)
SELECT 4.0, 6.5, 8.5, 20.0, 10
WHERE NOT EXISTS (SELECT 1 FROM alert_thresholds);

CREATE TABLE IF NOT EXISTS alerts (
  id BIGSERIAL PRIMARY KEY,
  device_id VARCHAR(64) NOT NULL,
  type VARCHAR(32) NOT NULL,
  severity VARCHAR(16) NOT NULL,
  message TEXT NOT NULL,
  value REAL NULL,
  threshold REAL NULL,
  reading_time TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_device_time ON alerts(device_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_type_time ON alerts(type, created_at DESC);

CREATE TABLE IF NOT EXISTS alert_cooldowns (
  device_id VARCHAR(64) NOT NULL,
  type VARCHAR(32) NOT NULL,
  last_sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (device_id, type)
);

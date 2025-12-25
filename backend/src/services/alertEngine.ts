import cron from "node-cron";
import { query } from "../db";
import { sendAlertEmail } from "./mailer";

type Thresholds = {
  salinity_high_ppt: number;
  ph_low: number;
  ph_high: number;
  battery_low_pct: number;
  no_data_minutes: number;
};

type Reading = {
  device_id: string;
  salinity: number | null;
  ph: number | null;
  temperature: number | null;
  battery: number | null;
  created_at: string;
};

export type AlertType = "SALINITY_HIGH" | "PH_OUT_OF_RANGE" | "BATTERY_LOW" | "NO_DATA";
export type AlertSeverity = "INFO" | "WARN" | "CRITICAL";

function nowIso() {
  return new Date().toISOString();
}

async function loadThresholds(): Promise<Thresholds> {
  const r = await query(
    `SELECT salinity_high_ppt, ph_low, ph_high, battery_low_pct, no_data_minutes
     FROM alert_thresholds
     ORDER BY updated_at DESC
     LIMIT 1`
  );
  if (r.rowCount === 0) {
    return { salinity_high_ppt: 4, ph_low: 6.5, ph_high: 8.5, battery_low_pct: 20, no_data_minutes: 10 };
  }
  return r.rows[0];
}

async function listDeviceIds(): Promise<string[]> {
  const r = await query(`SELECT DISTINCT device_id FROM sensor_readings`);
  return r.rows.map((x: any) => x.device_id as string);
}

async function getLatestReading(deviceId: string): Promise<Reading | null> {
  const r = await query(
    `SELECT device_id, salinity, ph, temperature, battery, created_at
     FROM sensor_readings
     WHERE device_id=$1
     ORDER BY created_at DESC
     LIMIT 1`,
    [deviceId]
  );
  return r.rowCount ? (r.rows[0] as Reading) : null;
}

async function cooldownOk(deviceId: string, type: AlertType, cooldownMinutes = 15): Promise<boolean> {
  const r = await query(`SELECT last_sent_at FROM alert_cooldowns WHERE device_id=$1 AND type=$2`, [deviceId, type]);
  if (r.rowCount === 0) return true;
  const last = new Date(r.rows[0].last_sent_at).getTime();
  const diffMin = (Date.now() - last) / (1000 * 60);
  return diffMin >= cooldownMinutes;
}

async function touchCooldown(deviceId: string, type: AlertType) {
  await query(
    `INSERT INTO alert_cooldowns (device_id, type, last_sent_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (device_id, type) DO UPDATE SET last_sent_at=NOW()`,
    [deviceId, type]
  );
}

async function insertAlert(params: {
  device_id: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  value?: number | null;
  threshold?: number | null;
  reading_time?: string | null;
}) {
  const { device_id, type, severity, message, value = null, threshold = null, reading_time = null } = params;
  await query(
    `INSERT INTO alerts (device_id, type, severity, message, value, threshold, reading_time)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [device_id, type, severity, message, value, threshold, reading_time]
  );
}

export async function runAlertEngineOnce() {
  const thresholds = await loadThresholds();
  const deviceIds = await listDeviceIds();

  for (const deviceId of deviceIds) {
    const latest = await getLatestReading(deviceId);

    // NO_DATA
    if (!latest) {
      const type: AlertType = "NO_DATA";
      if (await cooldownOk(deviceId, type)) {
        const msg = `No data received from device ${deviceId} (no readings in DB).`;
        await insertAlert({ device_id: deviceId, type, severity: "WARN", message: msg });
        await sendAlertEmail({
          subject: `[WSN ALERT] NO DATA - ${deviceId}`,
          text: `${msg}\nTime: ${nowIso()}\nRule: no data > ${thresholds.no_data_minutes} minutes`,
        });
        await touchCooldown(deviceId, type);
      }
      continue;
    }

    const lastTime = new Date(latest.created_at).getTime();
    const ageMin = (Date.now() - lastTime) / (1000 * 60);
    if (ageMin > thresholds.no_data_minutes) {
      const type: AlertType = "NO_DATA";
      if (await cooldownOk(deviceId, type)) {
        const msg = `No data from device ${deviceId} for ${Math.floor(ageMin)} minutes (threshold ${thresholds.no_data_minutes}).`;
        await insertAlert({
          device_id: deviceId,
          type,
          severity: "WARN",
          message: msg,
          value: Math.floor(ageMin),
          threshold: thresholds.no_data_minutes,
          reading_time: latest.created_at,
        });
        await sendAlertEmail({
          subject: `[WSN ALERT] NO DATA - ${deviceId}`,
          text: `${msg}\nLast reading: ${latest.created_at}\nNow: ${nowIso()}`,
        });
        await touchCooldown(deviceId, type);
      }
    }

    // SALINITY
    if (typeof latest.salinity === "number" && latest.salinity > thresholds.salinity_high_ppt) {
      const type: AlertType = "SALINITY_HIGH";
      if (await cooldownOk(deviceId, type)) {
        const msg = `High salinity at ${deviceId}: ${latest.salinity} ppt (threshold ${thresholds.salinity_high_ppt} ppt).`;
        await insertAlert({
          device_id: deviceId,
          type,
          severity: latest.salinity > 10 ? "CRITICAL" : "WARN",
          message: msg,
          value: latest.salinity,
          threshold: thresholds.salinity_high_ppt,
          reading_time: latest.created_at,
        });
        await sendAlertEmail({
          subject: `[WSN ALERT] SALINITY HIGH - ${deviceId}`,
          text: `${msg}\nReading time: ${latest.created_at}\nNow: ${nowIso()}`,
        });
        await touchCooldown(deviceId, type);
      }
    }

    // PH
    if (typeof latest.ph === "number" && (latest.ph < thresholds.ph_low || latest.ph > thresholds.ph_high)) {
      const type: AlertType = "PH_OUT_OF_RANGE";
      if (await cooldownOk(deviceId, type)) {
        const msg = `pH out of range at ${deviceId}: ${latest.ph} (range ${thresholds.ph_low} - ${thresholds.ph_high}).`;
        await insertAlert({
          device_id: deviceId,
          type,
          severity: "WARN",
          message: msg,
          value: latest.ph,
          threshold: latest.ph < thresholds.ph_low ? thresholds.ph_low : thresholds.ph_high,
          reading_time: latest.created_at,
        });
        await sendAlertEmail({
          subject: `[WSN ALERT] pH OUT OF RANGE - ${deviceId}`,
          text: `${msg}\nReading time: ${latest.created_at}\nNow: ${nowIso()}`,
        });
        await touchCooldown(deviceId, type);
      }
    }

    // BATTERY
    if (typeof latest.battery === "number" && latest.battery < thresholds.battery_low_pct) {
      const type: AlertType = "BATTERY_LOW";
      if (await cooldownOk(deviceId, type)) {
        const msg = `Low battery at ${deviceId}: ${latest.battery}% (threshold ${thresholds.battery_low_pct}%).`;
        await insertAlert({
          device_id: deviceId,
          type,
          severity: latest.battery < 10 ? "CRITICAL" : "WARN",
          message: msg,
          value: latest.battery,
          threshold: thresholds.battery_low_pct,
          reading_time: latest.created_at,
        });
        await sendAlertEmail({
          subject: `[WSN ALERT] BATTERY LOW - ${deviceId}`,
          text: `${msg}\nReading time: ${latest.created_at}\nNow: ${nowIso()}`,
        });
        await touchCooldown(deviceId, type);
      }
    }
  }
}

let started = false;

export function startAlertEngine() {
  if (started) return;
  started = true;

  // Run once at startup
  runAlertEngineOnce().catch((err) => console.error("runAlertEngineOnce error:", err));

  // Then run every minute
  cron.schedule("* * * * *", async () => {
    try {
      await runAlertEngineOnce();
    } catch (err) {
      console.error("Alert engine cron error:", err);
    }
  });

  console.log("✅ Alert engine started (runs every 1 minute)");
}

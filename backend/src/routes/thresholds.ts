import { Router } from "express";
import { query } from "../db";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const r = await query(
      `SELECT salinity_high_ppt, ph_low, ph_high, battery_low_pct, no_data_minutes, updated_at
       FROM alert_thresholds
       ORDER BY updated_at DESC
       LIMIT 1`
    );
    res.json(r.rowCount ? r.rows[0] : null);
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Internal error" });
  }
});

router.put("/", async (req, res) => {
  try {
    const { salinity_high_ppt, ph_low, ph_high, battery_low_pct, no_data_minutes } = req.body || {};

    const s = Number(salinity_high_ppt);
    const pl = Number(ph_low);
    const ph = Number(ph_high);
    const b = Number(battery_low_pct);
    const n = Number(no_data_minutes);

    if (![s, pl, ph, b, n].every((x) => Number.isFinite(x))) {
      return res.status(400).json({ error: "Invalid threshold values" });
    }
    if (pl >= ph) return res.status(400).json({ error: "ph_low must be < ph_high" });

    await query(
      `INSERT INTO alert_thresholds (salinity_high_ppt, ph_low, ph_high, battery_low_pct, no_data_minutes)
       VALUES ($1,$2,$3,$4,$5)`,
      [s, pl, ph, b, Math.floor(n)]
    );

    const latest = await query(
      `SELECT salinity_high_ppt, ph_low, ph_high, battery_low_pct, no_data_minutes, updated_at
       FROM alert_thresholds
       ORDER BY updated_at DESC
       LIMIT 1`
    );
    res.json(latest.rows[0]);
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Internal error" });
  }
});

export default router;

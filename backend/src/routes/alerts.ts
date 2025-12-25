import { Router } from "express";
import { query } from "../db";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const deviceId = (req.query.device_id as string) || null;
    const type = (req.query.type as string) || null;
    const severity = (req.query.severity as string) || null;
    const limit = Math.min(Number(req.query.limit || 100), 500);

    const where: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (deviceId) { where.push(`device_id=$${idx++}`); params.push(deviceId); }
    if (type) { where.push(`type=$${idx++}`); params.push(type); }
    if (severity) { where.push(`severity=$${idx++}`); params.push(severity); }

    const sql = `
      SELECT id, device_id, type, severity, message, value, threshold, reading_time, created_at
      FROM alerts
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;

    const r = await query(sql, params);
    res.json({ items: r.rows });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Internal error" });
  }
});

export default router;

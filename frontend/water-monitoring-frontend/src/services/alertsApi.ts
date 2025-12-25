export type AlertItem = {
  id: number;
  device_id: string;
  type: string;
  severity: string;
  message: string;
  value: number | null;
  threshold: number | null;
  reading_time: string | null;
  created_at: string;
};

export async function getAlerts(params?: {
  device_id?: string;
  type?: string;
  severity?: string;
  limit?: number;
}): Promise<AlertItem[]> {
  const qs = new URLSearchParams();
  if (params?.device_id) qs.set("device_id", params.device_id);
  if (params?.type) qs.set("type", params.type);
  if (params?.severity) qs.set("severity", params.severity);
  if (params?.limit) qs.set("limit", String(params.limit));

  const res = await fetch(`/api/alerts?${qs.toString()}`);
  if (!res.ok) throw new Error("Failed to load alerts");
  const data = await res.json();
  return data.items || [];
}

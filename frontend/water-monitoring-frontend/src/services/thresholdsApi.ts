export type Thresholds = {
  salinity_high_ppt: number;
  ph_low: number;
  ph_high: number;
  battery_low_pct: number;
  no_data_minutes: number;
  updated_at?: string;
};

export async function getThresholds(): Promise<Thresholds | null> {
  const res = await fetch(`/api/thresholds`);
  if (!res.ok) throw new Error("Failed to load thresholds");
  return await res.json();
}

export async function updateThresholds(payload: Thresholds): Promise<Thresholds> {
  const res = await fetch(`/api/thresholds`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update thresholds");
  return await res.json();
}

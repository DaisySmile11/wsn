import { useEffect, useState } from "react";
import Card from "../components/ui/Card";
import SectionTitle from "../components/ui/SectionTitle";
import { Thresholds, getThresholds, updateThresholds } from "../services/thresholdsApi";

export default function ThresholdsPage() {
  const [form, setForm] = useState<Thresholds>({
    salinity_high_ppt: 4,
    ph_low: 6.5,
    ph_high: 8.5,
    battery_low_pct: 20,
    no_data_minutes: 10,
  });
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        const t = await getThresholds();
        if (t) setForm(t);
      } catch {
        // ignore
      }
    })();
  }, []);

  const save = async () => {
    setStatus("");
    try {
      const saved = await updateThresholds(form);
      setForm(saved);
      setStatus("Saved ✅");
      setTimeout(() => setStatus(""), 2000);
    } catch (e: any) {
      setStatus(e.message || "Failed");
    }
  };

  const input = (label: string, key: keyof Thresholds, step = "0.1") => (
    <div>
      <div className="text-sm font-semibold text-slate-600">{label}</div>
      <input
        className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3"
        type="number"
        step={step}
        value={String(form[key] ?? "")}
        onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })}
      />
    </div>
  );

  return (
    <div className="space-y-8">
      <SectionTitle title="Alert Thresholds" subtitle="Configure alert rules (admin)." />

      <Card className="max-w-2xl mx-auto p-6 space-y-4">
        {input("Salinity high threshold (ppt)", "salinity_high_ppt")}
        {input("pH low threshold", "ph_low")}
        {input("pH high threshold", "ph_high")}
        {input("Battery low threshold (%)", "battery_low_pct")}
        {input("No data minutes", "no_data_minutes", "1")}

        <button
          onClick={save}
          className="w-full rounded-xl bg-brand-700 py-3 text-white font-extrabold hover:bg-brand-800"
        >
          Save
        </button>

        {status ? <div className="text-sm text-slate-600">{status}</div> : null}
      </Card>
    </div>
  );
}

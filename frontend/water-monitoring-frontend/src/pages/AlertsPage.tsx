import { useEffect, useMemo, useState } from "react";
import Card from "../components/ui/Card";
import SectionTitle from "../components/ui/SectionTitle";
import { AlertItem, getAlerts } from "../services/alertsApi";

export default function AlertsPage() {
  const [items, setItems] = useState<AlertItem[]>([]);
  const [error, setError] = useState<string>("");
  const [deviceId, setDeviceId] = useState<string>("");
  const [severity, setSeverity] = useState<string>("");

  const filtered = useMemo(() => {
    return items.filter((a) => {
      if (deviceId && a.device_id !== deviceId) return false;
      if (severity && a.severity !== severity) return false;
      return true;
    });
  }, [items, deviceId, severity]);

  useEffect(() => {
    (async () => {
      try {
        setError("");
        const data = await getAlerts({ limit: 200 });
        setItems(data);
      } catch (e: any) {
        setError(e.message || "Failed to load");
      }
    })();
  }, []);

  const deviceOptions = Array.from(new Set(items.map((x) => x.device_id)));

  return (
    <div className="space-y-8">
      <SectionTitle title="Alerts" subtitle="Alert history stored in the database." />

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <div className="text-xs text-slate-500 mb-1">Device</div>
            <select className="rounded-xl border border-slate-200 px-3 py-2"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
            >
              <option value="">All</option>
              {deviceOptions.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="text-xs text-slate-500 mb-1">Severity</div>
            <select className="rounded-xl border border-slate-200 px-3 py-2"
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
            >
              <option value="">All</option>
              <option value="INFO">INFO</option>
              <option value="WARN">WARN</option>
              <option value="CRITICAL">CRITICAL</option>
            </select>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
        ) : null}

        <div className="mt-4 overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-2 pr-4">Time</th>
                <th className="py-2 pr-4">Device</th>
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Severity</th>
                <th className="py-2 pr-4">Message</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id} className="border-t border-slate-100">
                  <td className="py-2 pr-4 whitespace-nowrap">{new Date(a.created_at).toLocaleString()}</td>
                  <td className="py-2 pr-4 whitespace-nowrap">{a.device_id}</td>
                  <td className="py-2 pr-4 whitespace-nowrap">{a.type}</td>
                  <td className="py-2 pr-4 whitespace-nowrap">{a.severity}</td>
                  <td className="py-2 pr-4">{a.message}</td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td className="py-4 text-slate-500" colSpan={5}>No alerts yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

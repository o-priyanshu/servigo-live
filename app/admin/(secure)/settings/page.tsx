"use client";

import { useEffect, useState } from "react";
import { useAdminStore } from "@/store/adminStore";

export default function AdminSettingsPage() {
  const settings = useAdminStore((state) => state.settings);
  const fetchSettings = useAdminStore((state) => state.fetchSettings);
  const updateSettings = useAdminStore((state) => state.updateSettings);

  const [commissionRate, setCommissionRate] = useState(12);
  const [safetyShieldPrice, setSafetyShieldPrice] = useState(15);
  const [minimumWithdrawal, setMinimumWithdrawal] = useState(500);
  const [disputeWindowHours, setDisputeWindowHours] = useState(24);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    if (!settings) return;
    setCommissionRate(settings.commissionRate);
    setSafetyShieldPrice(settings.safetyShieldPrice);
    setMinimumWithdrawal(settings.minimumWithdrawal);
    setDisputeWindowHours(settings.disputeWindowHours);
    setMaintenanceMode(settings.maintenanceMode);
  }, [settings]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Platform Settings</h1>

      <section className="grid gap-3 border border-zinc-800 bg-zinc-900 p-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span>Commission Rate (%)</span>
          <input className="h-9 w-full border border-zinc-700 bg-zinc-950 px-2" type="number" value={commissionRate} onChange={(e) => setCommissionRate(Number(e.target.value))} />
        </label>
        <label className="space-y-1 text-sm">
          <span>Safety Shield Price (?)</span>
          <input className="h-9 w-full border border-zinc-700 bg-zinc-950 px-2" type="number" value={safetyShieldPrice} onChange={(e) => setSafetyShieldPrice(Number(e.target.value))} />
        </label>
        <label className="space-y-1 text-sm">
          <span>Minimum Withdrawal (?)</span>
          <input className="h-9 w-full border border-zinc-700 bg-zinc-950 px-2" type="number" value={minimumWithdrawal} onChange={(e) => setMinimumWithdrawal(Number(e.target.value))} />
        </label>
        <label className="space-y-1 text-sm">
          <span>Dispute Window (hours)</span>
          <input className="h-9 w-full border border-zinc-700 bg-zinc-950 px-2" type="number" value={disputeWindowHours} onChange={(e) => setDisputeWindowHours(Number(e.target.value))} />
        </label>

        <label className="col-span-full flex items-center gap-2 text-sm">
          <input type="checkbox" checked={maintenanceMode} onChange={(e) => setMaintenanceMode(e.target.checked)} />
          Enable Maintenance Mode
        </label>

        <button
          className="col-span-full bg-blue-600 px-3 py-2 text-sm font-semibold"
          onClick={() =>
            void updateSettings({
              commissionRate,
              safetyShieldPrice,
              minimumWithdrawal,
              disputeWindowHours,
              maintenanceMode,
            })
          }
        >
          Save Settings
        </button>
      </section>
    </div>
  );
}


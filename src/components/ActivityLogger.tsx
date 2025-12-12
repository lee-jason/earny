"use client";

import { useState } from "react";
import {
  ACTIVITY_CONFIG,
  ActivityType,
  MeasurementUnit,
  getActivityTypes,
} from "@/config/activities";

interface ActivityLoggerProps {
  onSuccess?: (credits: number, newBalance: number) => void;
}

export function ActivityLogger({ onSuccess }: ActivityLoggerProps) {
  const [selectedActivity, setSelectedActivity] = useState<ActivityType | "">("");
  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState<MeasurementUnit | "">("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const activityTypes = getActivityTypes();
  const selectedConfig = selectedActivity ? ACTIVITY_CONFIG[selectedActivity] : null;

  const handleActivityChange = (activity: ActivityType) => {
    setSelectedActivity(activity);
    const config = ACTIVITY_CONFIG[activity];
    setUnit(config.allowedUnits[0]);
    if (config.allowedUnits.includes("session")) {
      setAmount("1");
    } else {
      setAmount("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedActivity || !amount || !unit) return;

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activityType: selectedActivity,
          amount: parseFloat(amount),
          unit,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({
          type: "success",
          text: `Earned ${data.creditsEarned} credits! New balance: ${data.newBalance}`,
        });
        setSelectedActivity("");
        setAmount("");
        setUnit("");
        onSuccess?.(data.creditsEarned, data.newBalance);
      } else {
        setMessage({ type: "error", text: data.error || "Failed to log activity" });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to log activity" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-lg font-semibold mb-4">Log Activity</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Activity Type
          </label>
          <div className="grid grid-cols-2 gap-3">
            {activityTypes.map((type) => {
              const config = ACTIVITY_CONFIG[type];
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleActivityChange(type)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    selectedActivity === type
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <span className="text-2xl">{config.icon}</span>
                  <p className="font-medium mt-1">{config.name}</p>
                  <p className="text-xs text-gray-500">{config.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {selectedConfig && (
          <>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter amount"
                  disabled={selectedConfig.allowedUnits.includes("session")}
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit
                </label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as MeasurementUnit)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {selectedConfig.allowedUnits.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-600">
                Credits you&apos;ll earn:{" "}
                <span className="font-semibold text-indigo-600">
                  {amount
                    ? Math.floor(
                        parseFloat(amount) *
                          (unit === "session"
                            ? selectedConfig.valuePerSession ?? 0
                            : unit === "miles"
                            ? selectedConfig.valuePerMile ?? 0
                            : selectedConfig.valuePerMinute ?? 0)
                      )
                    : 0}
                </span>
              </p>
            </div>
          </>
        )}

        {message && (
          <div
            className={`p-3 rounded-md ${
              message.type === "success"
                ? "bg-green-50 text-green-800"
                : "bg-red-50 text-red-800"
            }`}
          >
            {message.text}
          </div>
        )}

        <button
          type="submit"
          disabled={!selectedActivity || !amount || !unit || loading}
          className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Logging..." : "Log Activity"}
        </button>
      </form>
    </div>
  );
}

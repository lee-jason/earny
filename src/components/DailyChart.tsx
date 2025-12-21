"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Brush,
  CartesianGrid,
} from "recharts";

interface DailyData {
  date: string;
  earnings: number;
  spending: number;
}

interface DailyChartProps {
  days?: number;
}

interface TooltipPayload {
  dataKey: string;
  value: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0 || !label) return null;

  const date = new Date(label + "T00:00:00");
  const formattedDate = date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const earnings = payload.find((p) => p.dataKey === "earnings")?.value ?? 0;
  const spending = payload.find((p) => p.dataKey === "spending")?.value ?? 0;

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
      <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
        {formattedDate}
      </p>
      {earnings > 0 && (
        <p className="text-sm text-green-600 dark:text-green-400">
          Earned: +{earnings.toLocaleString()} credits
        </p>
      )}
      {spending < 0 && (
        <p className="text-sm text-red-600 dark:text-red-400">
          Spent: {spending.toLocaleString()} credits
        </p>
      )}
      {earnings === 0 && spending === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">No activity</p>
      )}
    </div>
  );
}

export function DailyChart({ days = 30 }: DailyChartProps) {
  const [data, setData] = useState<DailyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    setIsDark(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    fetchData();
  }, [days]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const res = await fetch(
        `/api/transactions/daily?days=${days}&timezone=${encodeURIComponent(timezone)}`
      );
      if (res.ok) {
        const json = await res.json();
        setData(json.dailyData);
      }
    } catch (error) {
      console.error("Failed to fetch daily data:", error);
    } finally {
      setLoading(false);
    }
  };

  const colors = {
    earnings: isDark ? "#4ade80" : "#22c55e",
    spending: isDark ? "#f87171" : "#ef4444",
    axis: isDark ? "#9ca3af" : "#6b7280",
    grid: isDark ? "#374151" : "#e5e7eb",
    reference: isDark ? "#4b5563" : "#d1d5db",
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-32 mb-4 animate-pulse" />
        <div className="h-64 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
      </div>
    );
  }

  const hasActivity = data.some((d) => d.earnings > 0 || d.spending < 0);

  if (!hasActivity) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 text-center">
        <p className="text-gray-500 dark:text-gray-400">No activity data yet</p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
          Start logging activities to see your daily trends
        </p>
      </div>
    );
  }

  const formatXAxis = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", {
      month: "numeric",
      day: "numeric",
    });
  };

  // Show last 14 days by default in brush, user can scroll to see more
  const defaultBrushStart = Math.max(0, data.length - 14);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
      <ResponsiveContainer width="100%" height={320}>
        <BarChart
          data={data}
          stackOffset="sign"
          margin={{ top: 20, right: 20, left: 20, bottom: 5 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={colors.grid}
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tickFormatter={formatXAxis}
            tick={{ fill: colors.axis, fontSize: 12 }}
            axisLine={{ stroke: colors.grid }}
            tickLine={{ stroke: colors.grid }}
          />
          <YAxis
            tick={{ fill: colors.axis, fontSize: 12 }}
            axisLine={{ stroke: colors.grid }}
            tickLine={{ stroke: colors.grid }}
            tickFormatter={(value) => value.toLocaleString()}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke={colors.reference} strokeWidth={2} />
          <Bar
            dataKey="earnings"
            stackId="stack"
            fill={colors.earnings}
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="spending"
            stackId="stack"
            fill={colors.spending}
            radius={[4, 4, 0, 0]}
          />
          <Brush
            dataKey="date"
            height={30}
            stroke={isDark ? "#6366f1" : "#4f46e5"}
            fill={isDark ? "#1f2937" : "#f9fafb"}
            tickFormatter={formatXAxis}
            startIndex={defaultBrushStart}
            endIndex={data.length - 1}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export type ActivityType = "gym" | "run" | "walk" | "bike";

export type MeasurementUnit = "session" | "miles" | "minutes";

export interface ActivityConfig {
  name: string;
  description: string;
  valuePerSession?: number;
  valuePerMile?: number;
  valuePerMinute?: number;
  allowedUnits: MeasurementUnit[];
  icon: string;
}

export const ACTIVITY_CONFIG: Record<ActivityType, ActivityConfig> = {
  gym: {
    name: "Gym Session",
    description: "Complete a gym workout session",
    valuePerSession: 60,
    allowedUnits: ["session"],
    icon: "🏋️",
  },
  run: {
    name: "Running",
    description: "Go for a run",
    valuePerMile: 20,
    valuePerMinute: 2,
    allowedUnits: ["miles", "minutes"],
    icon: "🏃",
  },
  walk: {
    name: "Walking",
    description: "Go for a walk",
    valuePerMile: 10,
    valuePerMinute: 1,
    allowedUnits: ["miles", "minutes"],
    icon: "🚶",
  },
  bike: {
    name: "Biking",
    description: "Go for a bike ride",
    valuePerMile: 15,
    valuePerMinute: 1.5,
    allowedUnits: ["miles", "minutes"],
    icon: "🚴",
  },
} as const;

export function calculateActivityValue(
  activityType: ActivityType,
  amount: number,
  unit: MeasurementUnit
): number {
  const config = ACTIVITY_CONFIG[activityType];

  if (!config.allowedUnits.includes(unit)) {
    throw new Error(
      `Unit "${unit}" is not allowed for activity "${activityType}"`
    );
  }

  switch (unit) {
    case "session":
      return Math.floor((config.valuePerSession ?? 0) * amount);
    case "miles":
      return Math.floor((config.valuePerMile ?? 0) * amount);
    case "minutes":
      return Math.floor((config.valuePerMinute ?? 0) * amount);
    default:
      throw new Error(`Unknown unit: ${unit}`);
  }
}

export function getActivityTypes(): ActivityType[] {
  return Object.keys(ACTIVITY_CONFIG) as ActivityType[];
}

export type Platform = "youtube" | "twitch";

export interface SpendingConfig {
  name: string;
  costPerMinute: number;
  description: string;
  icon: string;
}

export const SPENDING_CONFIG: Record<Platform, SpendingConfig> = {
  youtube: {
    name: "YouTube",
    costPerMinute: 1,
    description: "Watch videos on YouTube",
    icon: "📺",
  },
  twitch: {
    name: "Twitch",
    costPerMinute: 1,
    description: "Watch streams on Twitch",
    icon: "🎮",
  },
} as const;

export function calculateSpendingCost(
  platform: Platform,
  durationMinutes: number
): number {
  const config = SPENDING_CONFIG[platform];
  return Math.ceil(config.costPerMinute * durationMinutes);
}

export function getPlatforms(): Platform[] {
  return Object.keys(SPENDING_CONFIG) as Platform[];
}

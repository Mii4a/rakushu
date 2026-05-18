export const CONFIGURABLE_RANKS = ["S", "A", "B", "C", "D", "E"] as const;

export type ConfigurableRank = (typeof CONFIGURABLE_RANKS)[number];

export type RankSettings = {
  fixedOvertime: {
    aMaxHours: number;
    bMaxHours: number;
    cMaxHours: number;
    dMaxHours: number;
  };
  annualHolidays: {
    sMinDays: number;
    aMinDays: number;
    bMinDays: number;
    cMinDays: number;
    dMinDays: number;
  };
  bonus: {
    sMinCount: number;
    aMinCount: number;
    bMinCount: number;
    cMinCount: number;
  };
  retirementAllowance: {
    withAllowanceRank: ConfigurableRank;
    withoutAllowanceRank: ConfigurableRank;
  };
};

export function normalizeConfigurableRank(value: string, fallback: ConfigurableRank): ConfigurableRank {
  return CONFIGURABLE_RANKS.includes(value as ConfigurableRank) ? (value as ConfigurableRank) : fallback;
}

export const DEFAULT_RANK_SETTINGS: RankSettings = {
  fixedOvertime: {
    aMaxHours: 10,
    bMaxHours: 20,
    cMaxHours: 30,
    dMaxHours: 45
  },
  annualHolidays: {
    sMinDays: 130,
    aMinDays: 125,
    bMinDays: 120,
    cMinDays: 115,
    dMinDays: 110
  },
  bonus: {
    sMinCount: 3,
    aMinCount: 2,
    bMinCount: 2,
    cMinCount: 1
  },
  retirementAllowance: {
    withAllowanceRank: "A",
    withoutAllowanceRank: "D"
  }
};

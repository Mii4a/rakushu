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
};

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
  }
};

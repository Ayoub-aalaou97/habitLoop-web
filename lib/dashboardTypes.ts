export type MiniHeatCell = {
  color: string;
  dateKey: string | null;
  checked: boolean;
  locked?: boolean;
};

export type DashboardWeekDot = {
  on: boolean;
  off: boolean;
};

export type DashboardHobby = {
  id: string;
  name: string;
  color: string;
  goalLabel: string;
  streak: number;
  unit: string;
  periodLabel: string;
  consistency: number;
  atRisk: boolean;
  riskLabel: string | null;
  done: number;
  target: number;
  weekDots: DashboardWeekDot[];
  mini: MiniHeatCell[][];
};

export type ConsistencyMonth = {
  label: string;
  pct: number;
  fill: string;
};

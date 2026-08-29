import { API_URL, ApiErrorBody, getToken } from "@/lib/auth";

export type FreezeBalance = {
  remaining: number;
  total: number;
};

export type FreezesResponse = FreezeBalance & {
  by_habit: Record<string, string[]>;
};

function authHeaders(): HeadersInit {
  const token = getToken();
  if (!token) throw new Error("You are not logged in.");
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function readApiError(res: Response): Promise<string> {
  const data = (await res.json().catch(() => ({}))) as ApiErrorBody;
  const fieldError = data.errors
    ? Object.values(data.errors).flat()[0]
    : undefined;
  return fieldError || data.message || `Request failed (${res.status}).`;
}

export async function fetchFreezes(): Promise<FreezesResponse> {
  const res = await fetch(`${API_URL}/api/freezes`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  const data = (await res.json()) as FreezesResponse;
  return {
    remaining: Number(data.remaining ?? 0),
    total: Number(data.total ?? 3),
    by_habit: data.by_habit ?? {},
  };
}

export async function protectHabitPeriod(
  habitId: number,
  periodKey: string,
): Promise<FreezeBalance & { period_key: string }> {
  const res = await fetch(`${API_URL}/api/habits/${habitId}/freezes`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ period_key: periodKey }),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  const data = (await res.json()) as FreezeBalance & { period_key: string };
  return {
    remaining: Number(data.remaining ?? 0),
    total: Number(data.total ?? 3),
    period_key: data.period_key,
  };
}

export function frozenKeysForHabit(
  byHabit: Record<string, string[]>,
  habitId: number,
): string[] {
  return byHabit[String(habitId)] ?? byHabit[habitId as unknown as string] ?? [];
}

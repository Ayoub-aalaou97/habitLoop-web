import { API_URL, ApiErrorBody, getToken } from "@/lib/auth";

export type ApiCheckIn = {
  id: number;
  habit_id: number;
  date: string;
  mood: number;
  note: string | null;
  created_at: string;
  updated_at: string;
  freeze?: {
    remaining: number;
    total: number;
    spent: boolean;
    period_key: string | null;
  };
};

export type CreateCheckInPayload = {
  date: string;
  mood: number;
  note?: string | null;
};

export type CreateCheckInResult = ApiCheckIn & {
  freeze?: {
    remaining: number;
    total: number;
    spent: boolean;
    period_key: string | null;
  };
};

function authHeaders(): HeadersInit {
  const token = getToken();
  if (!token) {
    throw new Error("You are not logged in.");
  }

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

/** Normalize API date (Y-m-d or ISO datetime) to YYYY-MM-DD. */
export function normalizeCheckInDate(value: string): string {
  return value.slice(0, 10);
}

export async function fetchHabitCheckIns(
  habitId: number,
): Promise<ApiCheckIn[]> {
  const res = await fetch(`${API_URL}/api/habits/${habitId}/check-ins`, {
    headers: authHeaders(),
  });

  if (!res.ok) {
    throw new Error(await readApiError(res));
  }

  const data = (await res.json()) as ApiCheckIn[];
  return data.map((item) => ({
    ...item,
    date: normalizeCheckInDate(item.date),
  }));
}

export async function createHabitCheckIn(
  habitId: number,
  payload: CreateCheckInPayload,
): Promise<CreateCheckInResult> {
  const res = await fetch(`${API_URL}/api/habits/${habitId}/check-ins`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(await readApiError(res));
  }

  const item = (await res.json()) as CreateCheckInResult;
  return {
    ...item,
    date: normalizeCheckInDate(item.date),
  };
}

export async function deleteHabitCheckIn(
  habitId: number,
  checkInId: number,
): Promise<void> {
  const res = await fetch(
    `${API_URL}/api/habits/${habitId}/check-ins/${checkInId}`,
    {
      method: "DELETE",
      headers: authHeaders(),
    },
  );

  if (!res.ok) {
    throw new Error(await readApiError(res));
  }
}

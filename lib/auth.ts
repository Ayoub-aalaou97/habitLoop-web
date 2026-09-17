export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

const TOKEN_KEY = "habitloop_token";
const USER_KEY = "habitloop_user";

export type AuthUser = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
};

export type AuthResponse = {
  user: AuthUser;
  token: string;
};

export type ApiErrorBody = {
  message?: string;
  errors?: Record<string, string[]>;
};

export function saveToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function saveCachedUser(user: AuthUser) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    // ignore
  }
}

export function getCachedUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthUser;
    if (!parsed?.id || !parsed?.email) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearCachedUser() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(USER_KEY);
  } catch {
    // ignore
  }
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  clearCachedUser();
}

export async function fetchCurrentUser(token: string): Promise<AuthUser> {
  const res = await fetch(`${API_URL}/api/user`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Request failed with status ${res.status}`);
  }

  const user = (await res.json()) as AuthUser;
  saveCachedUser(user);
  return user;
}

export async function loginWithEmail(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/api/login`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  const data = (await res.json().catch(() => ({}))) as AuthResponse &
    ApiErrorBody;

  if (!res.ok) {
    const fieldError = data.errors
      ? Object.values(data.errors).flat()[0]
      : undefined;
    throw new Error(fieldError || data.message || "Login failed.");
  }

  if (data.user) saveCachedUser(data.user);
  return data;
}

export type RegisterPayload = {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  password_confirmation: string;
};

export async function registerWithEmail(
  payload: RegisterPayload,
): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/api/register`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = (await res.json().catch(() => ({}))) as AuthResponse &
    ApiErrorBody;

  if (!res.ok) {
    const fieldError = data.errors
      ? Object.values(data.errors).flat()[0]
      : undefined;
    throw new Error(fieldError || data.message || "Registration failed.");
  }

  if (data.user) saveCachedUser(data.user);
  return data;
}

export function continueWithGoogle() {
  window.location.href = `${API_URL}/api/auth/google`;
}

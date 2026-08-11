export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

const TOKEN_KEY = "habitloop_token";

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

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
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

  return res.json();
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

  return data;
}

export function continueWithGoogle() {
  window.location.href = `${API_URL}/api/auth/google`;
}

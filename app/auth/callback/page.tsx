"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { saveToken } from "@/lib/auth";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const errorParam = params.get("error");

    if (errorParam) {
      setError("Google login failed. Please try again.");
      return;
    }

    if (!token) {
      setError("No token received from the server.");
      return;
    }

    saveToken(token);

    // Remove the token from the URL so it does not stay in browser history.
    router.replace("/dashboard");
  }, [router]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      {error ? (
        <>
          <p className="text-red-600">{error}</p>
          <a href="/login" className="underline">
            Back to login
          </a>
        </>
      ) : (
        <p>Signing you in…</p>
      )}
    </main>
  );
}

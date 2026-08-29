"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { saveToken } from "@/lib/auth";
import { PageLoader } from "@/components/LoadingSpinner";

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

  if (error) {
    return (
      <main className="flex min-h-dvh flex-1 flex-col items-center justify-center gap-4 bg-bg p-8">
        <p className="text-danger">{error}</p>
        <a href="/login" className="text-brand-soft underline">
          Back to login
        </a>
      </main>
    );
  }

  return <PageLoader label="Signing you in…" />;
}

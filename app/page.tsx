import type { Metadata } from "next";
import { Suspense } from "react";
import { LandingPage } from "@/components/landing/LandingPage";
import { PageLoader } from "@/components/LoadingSpinner";

export const metadata: Metadata = {
  title: "HabitLoop — Count habits in loops, not days",
  description:
    "Daily, weekly, monthly — hit the target before the period ends and the loop closes. Start free.",
};

export default function Home() {
  return (
    <Suspense fallback={<PageLoader label="Loading…" />}>
      <LandingPage />
    </Suspense>
  );
}

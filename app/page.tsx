import { Suspense } from "react";
import type { Metadata } from "next";
import { JourneyForm } from "@/app/components/JourneyForm";

export const metadata: Metadata = {
  title: "Train Signal -- Check your journey signal",
};

export default function Home() {
  return (
    <main>
      <h1>Train Signal</h1>
      <p>Find out when you can take a call on your train journey.</p>
      <Suspense>
        <JourneyForm />
      </Suspense>
    </main>
  );
}

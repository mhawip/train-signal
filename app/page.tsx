import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Train Signal -- Check your journey signal",
};

export default function Home() {
  return (
    <main>
      <h1>Train Signal</h1>
      <p>Find out when you can take a call on your train journey.</p>
      <p>
        Enter your journey details to see when you are likely to have good
        enough signal for a voice or video call.
      </p>
    </main>
  );
}

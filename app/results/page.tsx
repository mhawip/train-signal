import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Journey results -- Train Signal",
};

interface ResultsPageProps {
  searchParams: Promise<{
    from?: string;
    to?: string;
    date?: string;
    time?: string;
    network?: string;
  }>;
}

export default async function ResultsPage({ searchParams }: ResultsPageProps) {
  const params = await searchParams;
  return (
    <main>
      <h1>Journey results</h1>
      <p>
        Signal data for this journey will appear here. This page is under
        construction.
      </p>
      {params.from && params.to && (
        <p>
          From: {params.from} &rarr; To: {params.to}
          {params.date && <>, Date: {params.date}</>}
          {params.time && <>, Time: {params.time}</>}
          {params.network && <>, Network: {params.network}</>}
        </p>
      )}
      <Link href="/">Back to search</Link>
    </main>
  );
}

// src/pages/TrialQuizPage.tsx
import React from "react";
import TrialQuizWidget from "@/components/TrialQuizWidget";

export default function TrialQuizPage() {
  return (
    <main className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Daily Trial Quiz</h1>
      <TrialQuizWidget />
    </main>
  );
}

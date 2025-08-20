import React from "react";
import { supabase } from "@/lib/supabase";

export default function VinoVocabPage() {
  const [v, setV] = React.useState<any>(null);
  const [pick, setPick] = React.useState<number | null>(null);
  const [status, setStatus] = React.useState("");
  const [result, setResult] = React.useState<{ correct: number; points: number; hint?: string } | null>(null);
  const [uid, setUid] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const userId = data?.user?.id ?? null;
      setUid(userId);

      const vocabData = await fetch("/.netlify/functions/vocab-today").then(r => r.json());
      console.log("🔍 Loaded vocab data:", vocabData);
      setV(vocabData);
    })();
  }, []);

  async function submit() {
    if (pick == null || !v) {
      setStatus("Please select an option.");
      return;
    }

    if (!uid) {
      setStatus("Please sign in (magic link) to save points.");
      return;
    }

    setStatus("Scoring…");
    try {
      const res = await fetch("/.netlify/functions/vocab-attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: uid, selection: pick })
      });

      const data = await res.json();
      console.log("🎯 Attempt result:", data);

      if (data?.alreadyAttempted) {
        setStatus("Already completed today.");
      } else if (data?.error) {
        setStatus(`Error: ${data.error}`);
      } else {
        setResult(data);
        setStatus("Saved!");
      }
    } catch (err) {
      console.error("⚠️ Submission error:", err);
      setStatus("Something went wrong. Please try again.");
    }
  }

  if (!v) return <div className="p-4">Loading…</div>;

  const answered = result !== null;
  const correctIndex = v.correct_option_index;

  return (
    <main className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-2 text-gray-900">Vino Vocab — {v.term}</h1>
      <p className="text-sm text-gray-600 mb-4">{new Date(v.for_date).toDateString()}</p>
      <div className="mb-4 text-lg font-medium text-gray-800">{v.question}</div>

      <div className="space-y-2">
        {v.options?.map((opt: string, i: number) => {
          const isSelected = pick === i;
          const isCorrect = answered && correctIndex === i;
          const isWrong = answered && isSelected && correctIndex !== i;

          let baseClasses = "w-full text-left px-4 py-2 rounded border font-medium transition focus:outline-none";
          let colorClasses = "";

          if (answered) {
            if (isCorrect) colorClasses = "bg-green-50 text-green-800 border-green-600";
            else if (isWrong) colorClasses = "bg-red-50 text-red-800 border-red-600";
            else colorClasses = "bg-white text-gray-400 border-gray-300 opacity-70";
          } else {
            colorClasses = isSelected
              ? "bg-black text-white border-black"
              : "bg-white hover:bg-gray-100 text-gray-800 border-gray-300";
          }

          return (
            <button
              key={i}
              onClick={() => !answered && setPick(i)}
              className={`${baseClasses} ${colorClasses}`}
              disabled={answered}
            >
              {opt}
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex items-center gap-2">
        <button
          onClick={submit}
          disabled={pick === null || answered}
          className={`px-5 py-2 rounded font-semibold transition
            ${answered || pick === null ? "bg-gray-300 text-white cursor-not-allowed" : "bg-black text-white hover:bg-gray-800"}`}
        >
          Submit
        </button>

        {result && (
          <span className="text-sm font-medium text-gray-800">
            You got it <strong>{result.correct ? "right" : "wrong"}</strong> — +{result.points} points
          </span>
        )}
      </div>

      {result && !result.correct && v.hint && (
        <div className="mt-4 text-sm text-yellow-800 bg-yellow-100 p-3 rounded border border-yellow-300">
          💡 Hint: {v.hint}
        </div>
      )}

      {status && <p className="mt-4 text-sm text-gray-600">{status}</p>}
    </main>
  );
}

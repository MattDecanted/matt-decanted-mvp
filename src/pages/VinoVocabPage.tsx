import React from "react";
import { supabase } from "@/lib/supabase";

export default function VinoVocabPage() {
  const [v, setV] = React.useState<any>(null);
  const [pick, setPick] = React.useState<number | null>(null);
  const [status, setStatus] = React.useState("");
  const [result, setResult] = React.useState<{ correct: number; points: number } | null>(null);
  const [uid, setUid] = React.useState<string | null>(null);
  const [stats, setStats] = React.useState<{ attempts: number; correct: number; total_points: number } | null>(null);
  const [showHint, setShowHint] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const userId = data?.user?.id ?? null;
      setUid(userId);

      const vocabData = await fetch("/.netlify/functions/vocab-today").then((r) => r.json());
      setV(vocabData);

      if (userId) {
        const statsData = await fetch("/.netlify/functions/vocab-user-stats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: userId })
        }).then((r) => r.json());
        setStats(statsData);
      }
    })();
  }, []);

  async function submit() {
    if (pick == null || !v || !uid) return;
    setStatus("Scoring…");
    const res = await fetch("/.netlify/functions/vocab-attempt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: uid, selection: pick })
    });
    const data = await res.json();
    if (data?.alreadyAttempted) {
      setStatus("Already completed today.");
    } else if (data?.error) {
      setStatus(`Error: ${data.error}`);
    } else {
      setResult(data);
      setStatus("Saved!");
    }
  }

  if (!v) return <div className="p-4">Loading…</div>;
  const answered = result !== null;
  const correctIndex = v.correct_option_index;

  return (
    <main className="p-6 max-w-xl mx-auto font-sans">
      <h1 className="text-3xl font-bold mb-1">Vino Vocab — {v.term}</h1>
      <p className="text-sm text-gray-500 mb-4">{new Date(v.for_date).toDateString()}</p>

      <p className="mb-4 text-gray-700 font-medium">{v.question}</p>

      <div className="space-y-2">
        {v.options?.map((opt: string, i: number) => {
          const isSelected = pick === i;
          const isCorrect = answered && correctIndex === i;
          const isWrong = answered && isSelected && correctIndex !== i;

          return (
            <button
              key={i}
              onClick={() => !answered && setPick(i)}
              disabled={answered}
              className={`w-full px-3 py-2 rounded-lg text-left border transition font-medium
                ${
                  answered
                    ? isCorrect
                      ? "bg-green-100 border-green-600 text-green-900"
                      : isWrong
                      ? "bg-red-100 border-red-500 text-red-900"
                      : "bg-white border-gray-300 text-gray-500"
                    : isSelected
                    ? "bg-black text-white border-black"
                    : "bg-white hover:bg-gray-50 border-gray-300 text-black"
                }`}
            >
              {opt}
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          onClick={submit}
          disabled={pick === null || answered}
          className={`px-4 py-2 rounded border font-semibold transition
            ${answered || pick === null ? "bg-gray-300 text-white cursor-not-allowed" : "bg-black text-white hover:bg-gray-800"}`}
        >
          Submit
        </button>
        {result && (
          <span className="text-sm">
            You got it <strong>{result.correct ? "right" : "wrong"}</strong> — +{result.points} points
          </span>
        )}
      </div>

      {v.hint && (
        <div className="mt-4">
          {!showHint ? (
            <button
              onClick={() => setShowHint(true)}
              className="text-sm text-blue-700 underline hover:text-blue-900"
            >
              Show Hint
            </button>
          ) : (
            <div className="bg-yellow-100 border border-yellow-400 p-3 rounded mt-2 text-sm text-yellow-800">
              Hint: {v.hint}
            </div>
          )}
        </div>
      )}

      {status && <p className="mt-3 text-sm text-gray-600">{status}</p>}

      {stats && (
        <div className="mt-6 border-t pt-4 text-sm text-gray-700">
          <h2 className="font-semibold mb-1">Your Stats</h2>
          <p>Total attempts: {stats.attempts}</p>
          <p>Correct answers: {stats.correct}</p>
          <p>Total points: {stats.total_points}</p>
        </div>
      )}
    </main>
  );
}

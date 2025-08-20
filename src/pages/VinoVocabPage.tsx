import React from "react";
import { supabase } from "@/lib/supabase";

export default function VinoVocabPage() {
  const [v, setV] = React.useState<any>(null);
  const [pick, setPick] = React.useState<number | null>(null);
  const [status, setStatus] = React.useState("");
  const [result, setResult] = React.useState<{ correct: boolean; points: number; hint?: string } | null>(null);
  const [uid, setUid] = React.useState<string | null>(null);
  const [stats, setStats] = React.useState<{ correct_answers: number; total_attempts: number; total_points: number } | null>(null);

  React.useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const userId = data?.user?.id ?? null;
      setUid(userId);

      const vocabData = await fetch("/.netlify/functions/vocab-today").then(r => r.json());
      setV(vocabData);

      if (userId) {
        const { data: statData } = await supabase
          .from("vocab_attempts")
          .select("correct, points_awarded")
          .eq("user_id", userId);

        const correct_answers = statData?.filter(r => r.correct).length ?? 0;
        const total_attempts = statData?.length ?? 0;
        const total_points = statData?.reduce((sum, r) => sum + (r.points_awarded ?? 0), 0) ?? 0;

        setStats({ correct_answers, total_attempts, total_points });
      }
    })();
  }, []);

  async function submit() {
    if (pick == null || !v) return;
    if (!uid) {
      setStatus("Please sign in (magic link) to save points.");
      return;
    }

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

      // Update stats
      setStats(prev => prev
        ? {
            ...prev,
            total_attempts: prev.total_attempts + 1,
            correct_answers: prev.correct_answers + (data.correct ? 1 : 0),
            total_points: prev.total_points + data.points
          }
        : null
      );
    }
  }

  if (!v) return <div className="p-4">Loading…</div>;

  const answered = result !== null;
  const correctIndex = v.correct_option_index;

  return (
    <main className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold mb-2">Vino Vocab — {v.term}</h1>
      <p className="text-sm text-gray-500 mb-4">{new Date(v.for_date).toDateString()}</p>

      <div className="mb-4 font-medium">{v.question}</div>

      <div className="space-y-2">
        {v.options?.map((opt: string, i: number) => {
          const isSelected = pick === i;
          const isCorrect = answered && correctIndex === i;
          const isWrong = answered && isSelected && correctIndex !== i;

          return (
            <button
              key={i}
              onClick={() => !answered && setPick(i)}
              className={`w-full text-left px-3 py-2 rounded border transition
                ${answered
                  ? isCorrect
                    ? "bg-green-100 border-green-600"
                    : isWrong
                    ? "bg-red-100 border-red-500"
                    : "bg-white border-gray-300 opacity-60"
                  : isSelected
                  ? "bg-black text-white border-black"
                  : "bg-white hover:bg-gray-100 border-gray-300"}`}
              disabled={answered}
            >
              {opt}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={submit}
          disabled={pick === null || answered}
          className={`px-4 py-2 rounded border font-medium transition
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

      {result && !result.correct && v.hint && (
        <div className="mt-3 text-sm text-yellow-700 bg-yellow-100 p-3 rounded border border-yellow-300">
          Hint: {v.hint}
        </div>
      )}

      {status && <p className="mt-3 text-sm text-gray-600">{status}</p>}

      {stats && (
        <div className="mt-6 p-4 border-t pt-4 text-sm text-gray-800 bg-gray-50 rounded">
          <h2 className="font-medium mb-2">Your Stats</h2>
          <ul>
            <li><strong>Total Attempts:</strong> {stats.total_attempts}</li>
            <li><strong>Correct Answers:</strong> {stats.correct_answers}</li>
            <li><strong>Total Points:</strong> {stats.total_points}</li>
          </ul>
        </div>
      )}
    </main>
  );
}

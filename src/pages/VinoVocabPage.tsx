import React from "react";
import { supabase } from "@/lib/supabase";
import { CheckCircle, XCircle, Sparkles } from "lucide-react";

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
      setV(vocabData);
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
    }
  }

  if (!v) return <div className="p-8 text-center animate-pulse">🍷 Loading today’s Vino Vocab…</div>;

  const answered = result !== null;
  const correctIndex = v.correct_option_index;

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-purple-50 flex flex-col items-center py-10 px-4">
      <div className="bg-white shadow-xl rounded-2xl w-full max-w-xl p-8">
        <h1 className="text-4xl font-bold text-purple-700 mb-1">Vino Vocab</h1>
        <p className="text-gray-500 text-sm mb-6">{new Date(v.for_date).toDateString()}</p>

        <h2 className="text-xl font-semibold text-gray-800 mb-2">{v.term}</h2>
        <p className="text-gray-700 mb-6">{v.question}</p>

        <div className="space-y-3">
          {v.options?.map((opt: string, i: number) => {
            const isSelected = pick === i;
            const isCorrect = answered && correctIndex === i;
            const isWrong = answered && isSelected && correctIndex !== i;

            return (
              <button
                key={i}
                onClick={() => !answered && setPick(i)}
                className={`w-full px-4 py-3 rounded-lg font-medium transition-all border text-left
                  ${answered
                    ? isCorrect
                      ? "bg-green-100 border-green-500 text-green-800"
                      : isWrong
                      ? "bg-red-100 border-red-400 text-red-700"
                      : "bg-gray-100 text-gray-400 border-gray-200"
                    : isSelected
                    ? "bg-purple-600 text-white border-purple-700"
                    : "bg-white hover:bg-purple-100 border-gray-300 text-gray-800"}`}
                disabled={answered}
              >
                {opt}
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex items-center gap-4">
          <button
            onClick={submit}
            disabled={pick === null || answered}
            className={`px-6 py-2 rounded-lg font-semibold transition-all shadow-sm
              ${answered || pick === null ? "bg-gray-300 text-white cursor-not-allowed" : "bg-purple-600 hover:bg-purple-700 text-white"}`}
          >
            Submit
          </button>

          {result && (
            <span className="flex items-center gap-1 text-sm font-medium text-gray-700">
              {result.correct ? <CheckCircle className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-red-500" />}
              You got it <strong>{result.correct ? "right" : "wrong"}</strong> — +{result.points} points
            </span>
          )}
        </div>

        {result && !result.correct && v.hint && (
          <div className="mt-5 p-4 bg-yellow-100 text-yellow-800 border border-yellow-300 rounded-lg">
            <Sparkles className="inline-block w-4 h-4 mr-1 -mt-1" /> Hint: <span className="italic">{v.hint}</span>
          </div>
        )}

        {status && <p className="mt-3 text-sm text-purple-700 italic">{status}</p>}
      </div>

      <div className="mt-10 w-full max-w-md bg-white shadow rounded-xl p-6 text-sm text-gray-700">
        <h3 className="font-semibold text-purple-600 text-base mb-2">📊 Your Stats (Coming Soon)</h3>
        <ul className="space-y-1">
          <li>• 1 game played</li>
          <li>• Current streak: 1</li>
          <li>• Best streak: 1</li>
          <li>• Total points: 10</li>
        </ul>
      </div>
    </main>
  );
}

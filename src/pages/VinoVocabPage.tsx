import React from "react";
import { supabase } from "@/lib/supabase";
import {
  Sparkles,
  Award,
  Activity,
  CheckCircle,
  Lightbulb
} from "lucide-react";

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
      console.log("🔍 Loaded vocab data:", vocabData); // Debug log
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
    console.log("🎯 Attempt result:", data); // Debug log

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
                    ? "bg-green-100 border-green-600 text-green-900 font-semibold"
                    : isWrong
                    ? "bg-red-100 border-red-500 text-red-900"
                    : "bg-white border-gray-300 opacity-60 text-gray-400"
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

      {/* Hints section */}
      <div className="mt-10">
        <h2 className="text-lg font-semibold flex items-center gap-2 text-gray-800 mb-2">
          <Lightbulb className="w-5 h-5 text-yellow-500" /> Hints
        </h2>
        <p className="text-sm text-gray-600">0/1 used</p>
      </div>

      {/* Stats panel */}
      <div className="mt-8 p-4 bg-white rounded-xl border border-gray-200 shadow-sm max-w-md">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-800">
          <Sparkles className="w-5 h-5 text-purple-500" /> Your Stats
        </h2>
        <div className="grid grid-cols-2 gap-4 text-sm text-gray-700">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span><strong>1</strong> Games Played</span>
          </div>
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-green-600" />
            <span><strong>100%</strong> Win Rate</span>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-orange-500" />
            <span><strong>1</strong> Current Streak</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-500" />
            <span><strong>1</strong> Best Streak</span>
          </div>
        </div>
        <div className="mt-4 bg-yellow-50 text-yellow-800 px-4 py-2 rounded text-sm">
          📈 1 day streak! Keep it up!
        </div>
      </div>
    </main>
  );
}

// src/components/TrialQuizWidget.tsx
import React from "react";
import { supabase } from "@/lib/supabase";

type QuizQ = { q: string; options: string[] };
type Quiz = {
  id: string;
  locale: string;
  for_date: string;
  title: string;
  questions: QuizQ[];
  points_award: number;
};

const FN_TODAY = "/.netlify/functions/trial-quiz-today?locale=en";
const FN_SUBMIT = "/.netlify/functions/trial-quiz-attempt";
const PENDING_KEY = "md_trial_pending";

export default function TrialQuizWidget() {
  const [loading, setLoading] = React.useState(true);
  const [quiz, setQuiz] = React.useState<Quiz | null>(null);
  const [selections, setSelections] = React.useState<number[]>([]);
  const [status, setStatus] = React.useState<string>("");
  const [result, setResult] = React.useState<{ correct: number; points: number } | null>(null);
  const [email, setEmail] = React.useState("");
  const [userId, setUserId] = React.useState<string | null>(null);

  // Load quiz + detect auth + resume pending
  React.useEffect(() => {
    (async () => {
      setLoading(true);

      // 1) who am I?
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes?.user?.id ?? null;
      setUserId(uid);

      // 2) load today's quiz
      const q = await fetch(FN_TODAY).then(r => r.json());
      setQuiz(q);
      setSelections(Array(q?.questions?.length || 0).fill(-1));
      setLoading(false);

      // 3) if logged in and we have a pending submission from before login, complete it now
      if (uid) {
        const pending = safeReadPending();
        if (pending && pending.quiz_id === q?.id) {
          await submitAttempt(uid, pending.quiz_id, pending.selections, setStatus, setResult);
          clearPending();
        }
      }
    })();
  }, []);

  function onPick(qi: number, oi: number) {
    setSelections(prev => {
      const next = [...prev];
      next[qi] = oi;
      return next;
    });
  }

  async function onFinish() {
    if (!quiz) return;
    // If user is logged in, submit now
    if (userId) {
      await submitAttempt(userId, quiz.id, selections, setStatus, setResult);
      return;
    }
    // Not logged in: store pending selections and show email box
    savePending({ quiz_id: quiz.id, selections });
    setStatus("Enter your email to save your points:");
  }

  async function onSendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("Sending magic link…");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/account`, // after click, they land here
      },
    });
    if (error) {
      setStatus(`Error: ${error.message}`);
    } else {
      setStatus("Check your email for the magic link. After you sign in, we’ll auto-save your points.");
    }
  }

  if (loading) return <div className="p-4 border rounded-md">Loading today’s quiz…</div>;
  if (!quiz?.id) return <div className="p-4 border rounded-md">No quiz found for today.</div>;

  const allAnswered = selections.every(i => i >= 0);

  return (
    <div className="p-4 border rounded-lg max-w-2xl">
      <h2 className="text-xl font-semibold mb-2">{quiz.title}</h2>
      <p className="text-sm text-gray-500 mb-4">Earn {quiz.points_award} points</p>

      <ol className="space-y-4">
        {quiz.questions.map((q, qi) => (
          <li key={qi}>
            <div className="font-medium mb-2">{qi + 1}. {q.q}</div>
            <div className="space-y-2">
              {q.options.map((opt, oi) => {
                const selected = selections[qi] === oi;
                return (
                  <button
                    type="button"
                    key={oi}
                    onClick={() => onPick(qi, oi)}
                    className={`w-full text-left px-3 py-2 rounded border ${
                      selected ? "bg-black text-white" : "bg-white hover:bg-gray-50"
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-4 flex items-center gap-2">
        <button
          disabled={!allAnswered}
          onClick={onFinish}
          className={`px-4 py-2 rounded font-medium border ${allAnswered ? "bg-black text-white" : "opacity-50"}`}
        >
          {userId ? "Submit answers" : "Finish & Save my points"}
        </button>
        {result && (
          <span className="text-sm">You scored <b>{result.correct}</b> / {quiz.questions.length} — +{result.points} points</span>
        )}
      </div>

      {/* Email capture for magic link */}
      {!userId && status && (
        <form onSubmit={onSendMagicLink} className="mt-4 flex items-center gap-2">
          <input
            type="email"
            placeholder="you@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="px-3 py-2 border rounded w-64"
            required
          />
          <button className="px-3 py-2 border rounded">Send magic link</button>
        </form>
      )}

      <p className="mt-3 text-sm text-gray-600">{status}</p>
    </div>
  );
}

// --- helpers ---
function savePending(v: { quiz_id: string; selections: number[] }) {
  localStorage.setItem(PENDING_KEY, JSON.stringify(v));
}
function safeReadPending():
  | { quiz_id: string; selections: number[] }
  | null {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
function clearPending() {
  localStorage.removeItem(PENDING_KEY);
}

async function submitAttempt(
  userId: string,
  quizId: string,
  selections: number[],
  setStatus: (s: string) => void,
  setResult: (r: { correct: number; points: number } | null) => void
) {
  setStatus("Scoring…");
  const res = await fetch(FN_SUBMIT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      quiz_id: quizId,
      locale: "en",
      user_id: userId,
      selections,
    }),
  });
  const data = await res.json();
  if (data?.alreadyAttempted) {
    setStatus("Already completed today — come back tomorrow!");
    setResult(null);
    return;
  }
  if (data?.error) {
    setStatus(`Error: ${data.error}`);
    setResult(null);
    return;
  }
  setStatus("Saved!");
  setResult({ correct: data.correct, points: data.points });
}

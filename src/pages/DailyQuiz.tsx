import * as React from "react";
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

export default function TrialQuizPage() {
  const [state, setState] = React.useState<"loading" | "ready" | "empty" | "error">("loading");
  const [quiz, setQuiz] = React.useState<Quiz | null>(null);
  const [answers, setAnswers] = React.useState<number[]>([]);
  const [message, setMessage] = React.useState<string>("");
  const [submitting, setSubmitting] = React.useState<boolean>(false);

  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/.netlify/functions/trial-quiz-today?locale=en");
        if (res.status === 404) {
          setState("empty");
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: Quiz = await res.json();
        setQuiz(data);
        setAnswers(new Array(data.questions.length).fill(-1));
        setState("ready");
      } catch (e: any) {
        console.error(e);
        setState("error");
      }
    })();
  }, []);

  async function submit() {
    if (!quiz) return;

    // ensure all answered
    if (answers.some((a) => a < 0)) {
      setMessage("Please answer all questions.");
      return;
    }

    // need user id
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id;
    if (!uid) {
      setMessage("Please sign in to save your points.");
      return;
    }

    setMessage("Scoring…");
    setSubmitting(true);

    try {
      // Post attempt to your existing Netlify function (keeps your backend scoring)
      const r = await fetch("/.netlify/functions/trial-quiz-attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quiz_id: quiz.id,
          locale: quiz.locale,
          user_id: uid,
          selections: answers,
        }),
      });

      const body = await r.json();

      if (body?.error) {
        setMessage(`Error: ${body.error}`);
        return;
      }

      if (body?.alreadyAttempted) {
        setMessage("Already completed today.");
        return;
      }

      // body.correct: number of correct answers (from your function)
      // body.points: points to award (from your function)
      const points = Number(body?.points ?? quiz.points_award ?? 0);
      const correct = Number(body?.correct ?? 0);

      // 7-day trial (idempotent). Safe even if function doesn’t exist.
      try {
        await supabase.rpc("vv_start_trial", { p_days: 7 });
      } catch (e) {
        // ignore; not fatal
        console.debug("vv_start_trial failed (ok to ignore):", e);
      }

      // Record + award points (only if not alreadyAttempted)
      try {
        await supabase.rpc("record_event", {
          p_user: uid,
          p_type: "TRIAL_QUIZ_RESULT",
          p_meta: { quiz_id: quiz.id, correct, points },
        });

        if (points > 0) {
          await supabase.rpc("add_points", { p_user: uid, p_points: points });
          await supabase.rpc("evaluate_badges", { p_user: uid });
        }
      } catch (e) {
        // If points pipeline fails, still tell user their quiz result
        console.warn("Points pipeline failed:", e);
      }

      setMessage(`You got ${correct} correct — +${points} points!`);
    } catch (e: any) {
      console.error(e);
      setMessage("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (state === "loading") return <main className="p-6">Loading…</main>;
  if (state === "empty") return <main className="p-6">No Quiz Available today — check back tomorrow!</main>;
  if (state === "error") return <main className="p-6">Something went wrong loading the quiz.</main>;
  if (!quiz) return null;

  return (
    <main className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-2">{quiz.title}</h1>
      <p className="text-sm text-gray-500 mb-6">{new Date(quiz.for_date).toDateString()}</p>

      <ol className="space-y-6">
        {quiz.questions.map((q, qi) => (
          <li key={qi}>
            <div className="font-medium mb-2">
              {qi + 1}. {q.q}
            </div>
            <div className="space-y-2">
              {q.options.map((opt, oi) => (
                <label key={oi} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name={`q${qi}`}
                    checked={answers[qi] === oi}
                    onChange={() => setAnswers((a) => a.map((v, idx) => (idx === qi ? oi : v)))}
                    disabled={submitting}
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={submit}
          className="px-4 py-2 rounded border bg-black text-white disabled:opacity-50"
          disabled={submitting}
        >
          {submitting ? "Submitting…" : "Submit"}
        </button>
        {message && <span className="text-sm">{message}</span>}
      </div>
    </main>
  );
}

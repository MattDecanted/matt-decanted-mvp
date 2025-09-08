// …inside CommunityPage component, before Filters…
const { user } = useAuth();

// Composer
function Composer() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState<"discussion"|"announcement"|"event">("discussion");
  const [tier, setTier] = useState<"free"|"pro"|"vip">("free");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string|null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.id) return;
    setBusy(true); setErr(null);
    try {
      const { data, error } = await supabase.from("community_posts").insert({
        author_id: user.id, title: title.trim(), content: content.trim(),
        post_type: type, min_tier: tier, is_published: true
      }).select("id").single();
      if (error) throw error;
      window.location.assign(`/community/${data!.id}`);
    } catch (e:any) {
      setErr(e?.message || "Could not create post.");
    } finally {
      setBusy(false);
    }
  }

  if (!user) return null;
  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <form onSubmit={submit} className="space-y-3">
        <div className="grid sm:grid-cols-3 gap-2">
          <input className="rounded border p-2 sm:col-span-2" value={title} onChange={e=>setTitle(e.target.value)} placeholder="Start a discussion: title" required />
          <select className="rounded border p-2" value={type} onChange={e=>setType(e.target.value as any)}>
            <option value="discussion">Discussion</option>
            <option value="announcement">Announcement</option>
            <option value="event">Event</option>
          </select>
        </div>
        <textarea className="w-full rounded border p-2" rows={3} value={content} onChange={e=>setContent(e.target.value)} placeholder="Write something helpful…" required />
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Visibility:</label>
          <select className="rounded border p-1 text-sm" value={tier} onChange={e=>setTier(e.target.value as any)}>
            <option value="free">Free</option>
            <option value="pro">Pro</option>
            <option value="vip">VIP</option>
          </select>
          <div className="flex-1" />
          <button type="submit" disabled={busy} className={`px-3 py-2 rounded text-white ${busy ? "bg-gray-400":"bg-blue-600 hover:bg-blue-700"}`}>
            {busy ? "Posting…" : "Post"}
          </button>
        </div>
        {err && <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded p-2">{err}</div>}
      </form>
    </div>
  );
}

import React from "react";
import { ShieldCheck, Settings, FileText, Video, ListChecks } from "lucide-react";
import { useNoIndex } from "@/hooks/useNoIndex";

export default function AdminHub() {
  useNoIndex(); // ensure search engines don't index this page

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <ShieldCheck className="w-7 h-7 text-emerald-600" />
        <h1 className="text-2xl font-semibold">Admin</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <AdminCard
          icon={<Video className="w-5 h-5" />}
          title="Guess What (Rounds & Questions)"
          desc="Create weekly rounds, add multiple questions, set reveal video and hero image."
          href="/admin/guess-what"
        />
        <AdminCard
          icon={<ListChecks className="w-5 h-5" />}
          title="Trial / Daily Quizzes"
          desc="Manage daily and trial quiz content and review attempts."
          href="/admin/trial-quizzes"
        />
        <AdminCard
          icon={<FileText className="w-5 h-5" />}
          title="Shorts"
          desc="Create and schedule short lessons."
          href="/admin/shorts"
        />
        <AdminCard
          icon={<Settings className="w-5 h-5" />}
          title="Users & Content Gates"
          desc="Users, roles, and gating rules."
          href="/admin/users"
        />
      </div>
    </div>
  );
}

function AdminCard({
  icon, title, desc, href,
}: { icon: React.ReactNode; title: string; desc: string; href: string }) {
  return (
    <a
      href={href}
      className="group rounded-xl border bg-white p-4 hover:shadow transition"
      rel="nofollow"
    >
      <div className="flex items-center gap-2 text-gray-900 font-medium">
        <span className="text-gray-700">{icon}</span>
        {title}
      </div>
      <p className="mt-1 text-sm text-gray-600">{desc}</p>
      <div className="mt-3 text-sm text-blue-600 group-hover:underline">Open</div>
    </a>
  );
}

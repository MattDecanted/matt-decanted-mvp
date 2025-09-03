// src/pages/Terms.tsx
import React from "react";

export default function Terms() {
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Terms & Conditions</h1>
      <p className="text-sm text-gray-600">
        Last updated: {new Date().toLocaleDateString()}
      </p>

      <section className="space-y-3 text-sm leading-6">
        <p>
          These Terms &amp; Conditions (“Terms”) govern your use of this website
          and our games, content, and services (collectively, the “Service”).
          By using the Service, you agree to these Terms.
        </p>

        <h2 className="text-lg font-medium mt-4">1. Accounts & Profiles</h2>
        <p>
          You are responsible for the activity on your account. Public
          information such as your alias may appear on leaderboards.
        </p>

        <h2 className="text-lg font-medium mt-4">2. Usage Rules</h2>
        <p>
          Don’t abuse or reverse engineer the Service. We may suspend accounts
          that violate these Terms.
        </p>

        <h2 className="text-lg font-medium mt-4">3. Purchases & Billing</h2>
        <p>
          If you purchase a subscription or item, additional terms from our
          billing provider may apply.
        </p>

        <h2 className="text-lg font-medium mt-4">4. Content</h2>
        <p>
          We may update content periodically. Scores and rewards may change due
          to fixes or abuse prevention.
        </p>

        <h2 className="text-lg font-medium mt-4">5. Privacy</h2>
        <p>
          We respect your privacy. See our <a className="underline" href="/privacy">Privacy Policy</a> for details.
        </p>

        <h2 className="text-lg font-medium mt-4">6. Changes</h2>
        <p>
          We may update these Terms. If material changes occur, we’ll notify you
          in-app or by email.
        </p>

        <h2 className="text-lg font-medium mt-4">7. Contact</h2>
        <p>
          Questions? Reach out at <a className="underline" href="mailto:support@example.com">support@example.com</a>.
        </p>
      </section>
    </div>
  );
}

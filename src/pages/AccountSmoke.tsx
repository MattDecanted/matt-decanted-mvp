import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AccountSmoke() {
  const [state, setState] = useState<any>({ note: 'init' });

  useEffect(() => {
    (async () => {
      try {
        const loc = new URL(window.location.href);
        const sess = await supabase.auth.getSession();
        const user = await supabase.auth.getUser();
        setState({
          ok: true,
          note: 'fetched',
          href: loc.href,
          hash: loc.hash,
          search: loc.search,
          session: sess.data.session ? {
            user_id: sess.data.session.user?.id,
            email: sess.data.session.user?.email,
            expires_at: sess.data.session.expires_at
          } : null,
          user: user.data.user ? {
            id: user.data.user.id,
            email: user.data.user.email
          } : null,
        });
      } catch (e: any) {
        setState({ ok: false, error: e?.message || String(e) });
      }
    })();
  }, []);

  return (
    <div style={{maxWidth: 800, margin: '40px auto', padding: 16, fontFamily: 'ui-sans-serif'}}>
      <h1 style={{fontSize: 20, fontWeight: 700}}>Account Smoke</h1>
      <p style={{color: '#555'}}>Minimal auth check without providers/contexts.</p>
      <pre style={{background: '#f6f8fa', padding: 12, borderRadius: 8, whiteSpace: 'pre-wrap'}}>
        {JSON.stringify(state, null, 2)}
      </pre>
      <div style={{marginTop: 12, fontSize: 12, color: '#666'}}>
        Tip: open console and run <code>SB.auth.getSession()</code>
      </div>
    </div>
  );
}

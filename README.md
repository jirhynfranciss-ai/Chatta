# A Little Question For You 💗

A romantic, interactive questionnaire experience with a real-time private chat and a
full admin console — built with Vite, React, TypeScript, Tailwind CSS, Zustand, and Supabase.

## 1. Set up Supabase

1. Create a project at https://supabase.com.
2. Open the SQL editor and run the entire contents of `supabase/schema.sql`.
   This creates every table, index, RLS policy, trigger, the storage bucket for
   avatars, and seeds the 15 questionnaire questions (plus the conditional
   follow-up questions for movies / music / games / Facebook).
3. (Optional but recommended) Deploy the account-deletion Edge Function:
   ```bash
   supabase functions deploy delete-account
   ```
   This lets users permanently delete their own account from the Profile page
   without ever exposing the service-role key to the browser.
4. Copy your project URL and anon public key into `.env.local`:
   ```env
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=xxxxx
   ```
5. Promote your own account to admin once you've registered through the app:
   ```sql
   insert into public.admin_users (user_id, role)
   values ('<your-auth-user-id>', 'superadmin');
   ```
6. Realtime must be enabled for `messages` and `conversations` — the schema
   script already adds both tables to the `supabase_realtime` publication.

## 2. Run locally

```bash
npm install
npm run dev
```

## 3. Build

```bash
npm run build
```

## Notes

- Until Supabase credentials are configured, the app still renders safely and
  shows a small banner inviting you to connect your project — no mock data is
  used anywhere.
- All questionnaire content, conditional logic, and site copy (title, welcome
  message, etc.) is data-driven from the `questions` and `site_settings`
  tables, not hardcoded in components.
- Admin access is enforced by Postgres Row Level Security via the
  `admin_users` table and the `is_admin()` SQL function — not by any
  client-side flag.

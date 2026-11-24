# Alibi

Alibi is a online journal for keeping track of what you did, when, and who you were with. Each entry (an "alibi") has a title, date and time, optional description, photos, a category, and the people who were there. You can filter it, and edit or delete entries.

Built with Expo (React Native) and Supabase. Runs on iOS only.

## Features

- **Accounts:** email and password sign-up and login, with an onboarding step for name, username and profile photo
- **Alibis:** create, edit and delete entries with multiple photos from the camera or photo library
- **Categories:** built-in categories, plus your own custom ones
- **People:** tag the people you were with; one alibi can have many people
- **Home feed:** swipeable photo carousel on each entry
- **Filters:** by date range (date of event or date posted), category and person
- **Profile:** change your profile photo, manage categories and people, or log out

## Tech stack

| Area | Choice |
| --- | --- |
| App | Expo SDK 58, React Native, TypeScript |
| Navigation | Expo Router (file-based routing) |
| State | React Context (`AuthContext`, `CreateContext`) |
| Database | Supabase Postgres with row-level security |
| Auth | Supabase Auth (email and password) |
| File storage | Supabase Storage (private bucket, signed URLs) |

## Project structure

```
src/
  app/
    (auth)/          login, signup, onboarding screens
    (tabs)/          home feed, add alibi, profile
    edit/[id].tsx    edit an existing alibi
  components/        AlibiForm, branding
  context/
    AuthContext.tsx  signed-in user, sign in/up/out, delete account
    CreateContext.tsx alibis, categories, and people 
  lib/
    supabase/        Supabase client and storage helpers
    theme.ts         colours
```

## Database

| Table | Purpose |
| --- | --- |
| `profiles` | One row per user: name, username, profile photo, onboarding status |
| `alibi_posts` | The entries: title, description, date, photo paths, category |
| `categories` | Built-in categories (`user_id` is null) and each user's custom ones |
| `people` | People a user can tag (only by name)|
| `alibi_people` | Join table linking alibis and people (many-to-many) |

Photos live in the private `alibi-photos` storage bucket. The database stores only file paths, and the app requests signed URLs that expire after one hour.

## Running it locally

1. Install dependencies

   ```bash
   npm install
   ```

2. Create a `.env` file in the project root with your Supabase project's details (found in the Supabase dashboard under **Project Settings → API**):

   ```
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

3. Start the app

   ```bash
   npx expo start
   ```

### Supabase setup

1. Create the tables above and turn on row-level security for each one, so users can only read and change their own rows.
2. Create a private storage bucket called `alibi-photos`.

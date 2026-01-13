# Milestone 1 Setup Instructions

## Files Created

### Configuration Files
- `package.json` - Next.js project dependencies
- `tsconfig.json` - TypeScript configuration
- `tailwind.config.ts` - Tailwind CSS configuration
- `postcss.config.mjs` - PostCSS configuration
- `next.config.mjs` - Next.js configuration
- `.eslintrc.json` - ESLint configuration
- `.gitignore` - Git ignore rules
- `env.example` - Environment variables template

### Database
- `supabase/migrations/001_create_profiles.sql` - Profiles table migration

### Core Application Files
- `app/layout.tsx` - Root layout
- `app/page.tsx` - Landing page
- `app/globals.css` - Global styles
- `middleware.ts` - Route protection middleware

### Auth Pages
- `app/login/page.tsx` - Login page with role-based redirect
- `app/signup/page.tsx` - Signup page with role selection

### Protected Pages (Placeholders)
- `app/waitlist/page.tsx` - Customer waitlist page (placeholder)
- `app/barber/dashboard/page.tsx` - Barber dashboard page (placeholder)

### Supabase Utilities
- `lib/supabase/client.ts` - Browser Supabase client
- `lib/supabase/server.ts` - Server Supabase client

### API Routes (Optional - created but not used in client pages)
- `app/api/auth/login/route.ts` - Login API route
- `app/api/auth/signup/route.ts` - Signup API route

---

## Commands to Run Locally

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Supabase
1. Create a new Supabase project at https://supabase.com
2. Go to SQL Editor in Supabase dashboard
3. Run the migration file: `supabase/migrations/001_create_profiles.sql`
4. Copy your Supabase URL and anon key from Settings > API

### 3. Set Up Environment Variables
Create a `.env.local` file in the root directory:
```bash
cp env.example .env.local
```

Then edit `.env.local` and add your Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Run Development Server
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

---

## How to Verify Signup/Login + Role Redirect Works

### Test Customer Signup & Redirect
1. Navigate to `http://localhost:3000`
2. Click "Join Waitlist" (or go to `/signup`)
3. Fill in the form:
   - Email: `customer@test.com`
   - Password: `password123` (min 6 characters)
   - Select "Customer" from the role dropdown
4. Click "Sign Up"
5. **Expected:** Redirected to `/waitlist` page

### Test Barber Signup & Redirect
1. Navigate to `/signup`
2. Fill in the form:
   - Email: `barber@test.com`
   - Password: `password123`
   - Select "Barber" from the role dropdown
3. Click "Sign Up"
4. **Expected:** Redirected to `/barber/dashboard` page

### Test Customer Login & Redirect
1. Navigate to `/login`
2. Enter credentials:
   - Email: `customer@test.com`
   - Password: `password123`
3. Click "Login"
4. **Expected:** Redirected to `/waitlist` page

### Test Barber Login & Redirect
1. Navigate to `/login`
2. Enter credentials:
   - Email: `barber@test.com`
   - Password: `password123`
3. Click "Login"
4. **Expected:** Redirected to `/barber/dashboard` page

### Test Route Protection
1. **Test unauthorized access:**
   - Open incognito/private window
   - Navigate to `/waitlist`
   - **Expected:** Redirected to `/login`
   
2. **Test barber route protection:**
   - Log in as customer (`customer@test.com`)
   - Try to navigate to `/barber/dashboard`
   - **Expected:** Redirected to `/waitlist` (middleware prevents access)

3. **Test customer route protection:**
   - Log in as barber (`barber@test.com`)
   - Try to navigate to `/waitlist`
   - **Expected:** Should work (customers can access waitlist, but barbers are redirected to dashboard on login - you can manually test by typing the URL)

### Verify Database
1. Go to Supabase Dashboard > Table Editor
2. Check the `profiles` table
3. **Expected:** See entries with:
   - `id` matching auth.users
   - `email` matching signup email
   - `role` set to either "customer" or "barber"

---

## Troubleshooting

### "Invalid API key" error
- Check that `.env.local` has correct `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Restart dev server after changing env variables

### "relation 'profiles' does not exist" error
- Run the SQL migration in Supabase SQL Editor

### Redirect not working
- Check browser console for errors
- Verify user is authenticated (check Supabase Auth dashboard)
- Verify profile exists in `profiles` table

### "new row violates row-level security policy" error
- Verify RLS policies are created correctly in the migration
- Check that the policy allows users to insert their own profile


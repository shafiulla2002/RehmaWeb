# RehmaWeb — Rhema Christian Ministries Web Application

Production-ready, full-stack Next.js web application for the **Rhema Christian Ministries Platform**, with all **46 modules (M01–M46) fully connected to live Firebase Firestore**.

## Highlights
- **100% Database Connected**: All 46 modules integrated with real-time Firebase Firestore subscriptions (`onSnapshot`) and atomic CRUD operations.
- **Single-Church Canonical Anchor**: Standardized to `Rhema Church/rhema` single-church schema.
- **Cross-Platform Mobile Compatible**: 100% schema alignment with the Rhema React Native mobile app (`Rhema/app`).
- **Hardened Security Rules**: Complete role-based access control, cross-member data isolation, and admin privilege verification enforced in `firestore.rules`.
- **53 Production Routes**: 100% clean compilation on Next.js 16 with zero TypeScript or build errors.

## Technologies Used
- **Framework**: Next.js 16 (App Router, Webpack engine)
- **UI & State**: React 19 + TypeScript 5
- **Styling**: Tailwind CSS v4
- **Backend & Database**: Firebase Web SDK v12 (Firestore, Authentication, Storage)
- **Icons**: Lucide React

## Project Structure
```
web-new/
├── src/
│   ├── app/
│   │   ├── admin/           # Admin Console shell & routes (M27–M46)
│   │   ├── dashboard/       # Member Portal hub & routes (M04–M26)
│   │   ├── globals.css      # Tailwind CSS & theme tokens
│   │   ├── layout.tsx       # Root layout with Theme & Language providers
│   │   └── page.tsx         # Landing page & foundation status
│   ├── components/
│   │   ├── layout/          # MemberNavigationShell & AdminNavigationShell
│   │   └── ui/              # Reusable UI primitives (Button, Card, Modal)
│   ├── contexts/            # ThemeContext (Light/Dark) & LanguageContext (7 Languages)
│   └── lib/
│       └── firebase.ts      # Singleton Firebase Web SDK initialization
├── .env.example             # Template for client-side Firebase environment variables
├── .env.local               # Local development Firebase config (reads existing backend)
├── next.config.ts           # Next.js configuration
├── tsconfig.json            # TypeScript configuration
└── package.json             # Locked dependencies
```

## Local Development Instructions

### 1. Prerequisites
- Node.js >= 18 (Tested on v24.15)
- npm >= 9

### 2. Environment Configuration
Verify that `.env.local` contains the client-side configuration for the genuine registered Rhema Firebase Web App:
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=<REDACTED_CLIENT_API_KEY>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=rhema-global-ministries.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=rhema-global-ministries
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=rhema-global-ministries.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=771098328860
NEXT_PUBLIC_FIREBASE_APP_ID=1:771098328860:web:6bd454dc063ec76f80c4d9
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-1E34PT1SXL
```

> **Security & Secret Hygiene Notice**: Never commit `.env.local` or expose raw production API keys or tokens in public logs or version control. Use `.env.example` as a sanitised schema template.

### 3. Run Development Server
```bash
cd web-new
npm run dev
```
Open [http://127.0.0.1:3000](http://127.0.0.1:3000) in your browser.

### 4. Build for Production
```bash
npm run build
npm run start
```

## Phone Authentication & Local Development Details

### 1. Local Origin Behavior: Why `127.0.0.1` Works While `localhost` Fails
- **Observed Behavior**: Firebase Phone Authentication OTP requests succeed when navigating to `http://127.0.0.1:3000/auth/login`, but fail with HTTP 400 `INVALID_RECAPTCHA_TOKEN` when accessing via `http://localhost:3000/auth/login`.
- **Root Cause**:
  1. Firebase Authentication utilizes **reCAPTCHA Enterprise / Fraud Defense** (`identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode`).
  2. While `localhost` and `127.0.0.1` may both be listed in Firebase Console under *Authentication -> Settings -> Authorized Domains*, reCAPTCHA Enterprise uses a **separate Google Cloud reCAPTCHA Enterprise Key** (`Key for Identity Platform reCAPTCHA integration`).
  3. In Google Cloud Console (*Security -> reCAPTCHA Enterprise -> Keys*), the key's **Domain Verification** list includes `127.0.0.1` and production domains, but does **not** yet include the hostname `localhost`.
  4. Consequently, tokens generated under origin `http://localhost:3000` are rejected by Google's backend verification check, whereas tokens generated under `http://127.0.0.1:3000` validate successfully.
- **Recommended Workflow**: For local development and testing, run and access the application strictly at `http://127.0.0.1:3000/auth/login`.
- **Permanent Fix (Optional / Pending Admin Action)**: In Google Cloud Console under *Security -> reCAPTCHA Enterprise -> Keys*, edit the Identity Platform key and add `localhost` to its Domain Verification list. Allow 5–10 minutes for Google CDN propagation.

### 2. Correct Firebase Web App Configuration
- **Firebase Project**: `rhema-global-ministries`
- **Registered Web App**: `Rhema Web Portal`
- **Genuine Web App ID**: `1:771098328860:web:6bd454dc063ec76f80c4d9`
- **Messaging Sender ID**: `771098328860`
- **Auth Domain**: `rhema-global-ministries.firebaseapp.com`
- **Storage Bucket**: `rhema-global-ministries.firebasestorage.app`

### 3. reCAPTCHA Enterprise Configuration Requirements
- **Fraud Defense Enforcement**: When Firebase Authentication Fraud Defense is set to **ENFORCE**, the Firebase Web SDK initializes a `RecaptchaEnterpriseVerifier` behind the scenes.
- **Client Lifecycle**:
  - A fresh DOM mounting point is instantiated per verification attempt to prevent stale widget reusing errors (`createFreshRecaptchaMount('recaptcha-container')`).
  - Stale verifier instances are cleanly cleared on error or unmount via `clearRecaptcha()`.
  - All errors (such as `auth/invalid-app-credential` or `auth/invalid-recaptcha-token`) are mapped to clean user-facing guidance.
- **Allowed Origins**: Any origin serving the application must be registered in both:
  1. Firebase Authentication Console -> Settings -> Authorized Domains.
  2. Google Cloud Console -> Security -> reCAPTCHA Enterprise -> Key Domain Verification.

### 4. Configuring Firebase Test Phone Numbers for Development
To test phone authentication and OTP verification without consuming real SMS quotas or sending SMS messages:
1. Navigate to **Firebase Console** -> **Authentication** -> **Sign-in method** tab.
2. Click on the **Phone** provider row to expand its settings.
3. Locate the **Phone numbers for testing (optional)** section.
4. Click **Add phone number**.
5. Enter a dedicated test number and a fixed 6-digit verification code:
   - Example Phone: `+91 9876543210` (or your test phone format)
   - Example 6-Digit Code: `123456`
6. Click **Save**.
7. In the login screen (`http://127.0.0.1:3000/auth/login`), enter the 10-digit number. When prompted for OTP, enter the configured 6-digit test code (`123456`). Firebase will verify the code immediately without sending an SMS.

### 5. Manual Church Admin Login & Role-Verification Procedure
After entering OTP and completing verification:
1. **Authentication State**: Firebase Authentication sets the active authenticated user (`firebaseUser.phoneNumber`, `firebaseUser.uid`).
2. **Profile & Role Resolution**:
   - `AuthContext.tsx` listens via `onAuthStateChanged` and queries Firestore:
     ```typescript
     doc(db, 'Rhema Church', 'rhema', 'members', firebaseUser.uid)
     ```
   - If the member document exists, the user's role is computed with strict Super Admin precedence:
     - **Super Admin**: Checked if `isPlatformSuperAdmin === true`, `superadmin === true`, `isSuperAdmin === true`, `role === 'superadmin'`, or `userType === 'super admin'`.
     - **Church Admin**: Checked if `role === 'admin'` or `userType === 'ADMIN'`.
     - **Church Member**: Default if neither admin condition matches.
3. **Admin Redirection**:
   - Members with `admin` or `superadmin` role have access to the Admin Console routes (`/admin`, `/admin/daily-verses`, `/admin/promises`, `/admin/quizzes`, `/admin/sermons`, `/admin/songs`).
   - Ordinary members are directed to `/dashboard`.
   - Pending applicants are routed to `/auth/pending`.
   - Unregistered authenticated users are routed to `/auth/register`.
4. **Verification Step**:
   - Sign in with the registered Church Admin mobile number at `http://127.0.0.1:3000/auth/login`.
   - Complete OTP verification.
   - Navigate to `http://127.0.0.1:3000/admin`. Verify that the Admin Navigation Shell and administrative metrics/modules display correctly without redirection.

## Backend Safety Notice
This web application is configured to strictly interact with the existing Firebase backend without modifying collections, security rules, storage rules, or production data during development or testing.

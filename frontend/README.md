# JSRMS — React Edition

Journal Submission and Review Management System, built with React + Vite + React Router. Every page links to its respective page through proper routing — no broken links.

## What's inside

A fully-functioning multi-page React app with 4 user roles:

- **Public** — Landing page, Sign In, Create Account
- **Author** — Dashboard, My Papers, Submit Paper (3-step), Revision, Notifications, Profile, Settings
- **Reviewer** — Dashboard, Assigned, Submit Review (with live composite score), Completed, Notifications, Profile
- **Chief Editor** — Dashboard, All Submissions, Pending Decisions, Notifications, Settings
- **Administrator** — Dashboard, Manage Users, Submissions, System Settings

Plus a custom 404 page for any unknown route.

## Quick start

You'll need [Node.js 18+](https://nodejs.org) installed.

```bash
# 1. Install dependencies (only first time)
npm install

# 2. Start the dev server
npm run dev
```

The app will open automatically at `http://localhost:5173`.

## How navigation works

Every link uses React Router's `<Link>` and `<NavLink>` — the page won't reload, just transition smoothly:

- **Home page** has nav links to every role's dashboard (try them).
- **Sign In / Sign Up** form submission redirects to the right dashboard.
- **Sidebar** highlights the active page based on the current URL.
- **Submit Paper** wizard moves through 3 steps, then redirects to Author Dashboard.
- **Submit Review** form submits and redirects to Reviewer Dashboard.
- **Resubmit Revision** redirects to Author Dashboard.
- **Sign out** (sidebar footer) sends you back to /login.
- **Any wrong URL** shows the custom 404 page.

## Project structure

```
jsrms-react/
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── main.jsx              # entry, BrowserRouter
    ├── App.jsx               # all routes
    ├── styles.css            # full design system
    ├── components/
    │   ├── AppShell.jsx      # sidebar + topbar layout
    │   ├── Sidebar.jsx       # role-aware nav with NavLink
    │   └── Topbar.jsx
    ├── data/
    │   └── sidebarConfig.jsx # nav config per role
    └── pages/                # 17 route components
        ├── HomePage.jsx
        ├── AuthPage.jsx
        ├── AuthorDashboard.jsx
        ├── MyPapers.jsx
        ├── SubmitPaper.jsx
        ├── Revision.jsx
        ├── ReviewerDashboard.jsx
        ├── ReviewForm.jsx
        ├── ReviewerCompleted.jsx
        ├── EditorDashboard.jsx
        ├── EditorSubmissions.jsx
        ├── AdminDashboard.jsx
        ├── AdminUsers.jsx
        ├── Notifications.jsx
        ├── Profile.jsx
        ├── Settings.jsx
        └── NotFound.jsx
```

## Build for production

```bash
npm run build       # outputs to /dist
npm run preview     # preview the production build
```

## Design system

- **Fonts**: Fraunces (display, with italic accents), Inter (body), JetBrains Mono (labels)
- **Palette**: navy-dominant (#042C53) with amber accents (#EF9F27)
- **All design tokens** are CSS variables in `src/styles.css` — easy to retheme

## Notes

- This is a **front-end only** demo. There's no backend — form data isn't persisted between page loads. If you refresh, sample data resets.
- All names, papers, and statistics are placeholder data for design demonstration.
- To deploy, run `npm run build` and host the `dist/` folder on any static hosting (Vercel, Netlify, GitHub Pages).

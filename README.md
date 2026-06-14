# Employee Ponto App

Static React companion app for employees to register location-based time-clock records, request time-clock adjustments, submit sick-leave documents, and read time-clock alerts.

## Local setup

```bash
npm install
cp .env.example .env
npm run dev
```

Set `VITE_API_BASE_URL` to the public EmployeeTracker backend URL.

## GitHub Pages

The included workflow deploys `dist/` to GitHub Pages on pushes to `main`.

In GitHub repository settings:

- Enable Pages.
- Set source to GitHub Actions.
- Add repository variable `VITE_API_BASE_URL` with the backend URL.

The EmployeeTracker backend must allow this GitHub Pages origin in `EMPLOYEE_APP_ORIGINS`.

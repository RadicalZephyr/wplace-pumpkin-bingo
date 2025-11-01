# Pumpkin Bingo

A modern React + TypeScript project bootstrapped with [Vite](https://vite.dev/) for building the Pumpkin Bingo application. This guide walks you through setting up the development environment, running the app, and understanding the project's structure.

## Prerequisites

- [Node.js](https://nodejs.org/) 18 or later
- [pnpm](https://pnpm.io/), [npm](https://www.npmjs.com/), or [yarn](https://yarnpkg.com/) package manager (examples below use `npm`)

## Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Run the development server**
   ```bash
   npm run dev
   ```
   This starts Vite's dev server with hot module replacement. Open the printed local URL in your browser to view the app.

3. **Build for production**
   ```bash
   npm run build
   ```
   The optimized output is generated in the `dist/` directory.

4. **Preview the production build**
   ```bash
   npm run preview
   ```
   Useful for verifying the production bundle locally before deploying.

## Project Structure

```
├── public/          # Static assets copied to the root of the build
├── src/             # Application source code
│   ├── assets/      # Images, fonts, and other asset files
│   ├── components/  # Reusable UI components
│   ├── App.tsx      # Root component
│   └── main.tsx     # Application bootstrap
├── index.html       # HTML entry file used by Vite
├── vite.config.ts   # Vite configuration
└── tsconfig*.json   # TypeScript configuration files
```

## Available Scripts

- `npm run dev` – Start the development server.
- `npm run build` – Create a production build.
- `npm run preview` – Preview the production build locally.
- `npm run lint` – Run ESLint checks.

## Environment Variables

Create a `.env` file at the project root to add custom environment variables. Prefix client-side variables with `VITE_` (for example, `VITE_API_URL`) so Vite can expose them to the frontend.

## Additional Resources

- [Vite Documentation](https://vite.dev/guide/)
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)

Happy hacking!

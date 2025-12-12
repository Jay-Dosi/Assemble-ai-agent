import './globals.css';
import type { ReactNode } from 'react';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900">
        <header className="px-6 py-4 shadow bg-white">
          <div className="max-w-5xl mx-auto">
            <h1 className="text-2xl font-semibold">Dependency Doctor Dashboard</h1>
            <p className="text-sm text-slate-500">
              Incidents, repair attempts, reinforcement signals, and PRs.
            </p>
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-6 py-6">{children}</main>
      </body>
    </html>
  );
}


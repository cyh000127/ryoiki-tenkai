import { type ReactNode } from "react";

type AppShellProps = {
  children: ReactNode;
  headerNotice?: ReactNode;
};

export function AppShell({ children, headerNotice }: AppShellProps) {
  return (
    <main className="app-shell">
      <header className="app-shell__header">
        <h1 className="app-shell__title">Seal Battle</h1>
        {headerNotice}
      </header>
      {children}
    </main>
  );
}

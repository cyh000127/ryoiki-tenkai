import { type ReactNode } from "react";

import { copy } from "../i18n/catalog";

type AppShellProps = {
  children: ReactNode;
  headerNotice?: ReactNode;
};

export function AppShell({ children, headerNotice }: AppShellProps) {
  return (
    <main className="app-shell">
      <header className="app-shell__header">
        <div>
          <p className="app-shell__eyebrow">손동작 술식 전투</p>
          <h1 className="app-shell__title">{copy.appTitle}</h1>
        </div>
        {headerNotice}
      </header>
      {children}
    </main>
  );
}

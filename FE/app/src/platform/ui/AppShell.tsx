import { type ReactNode } from "react";

import { copy } from "../i18n/catalog";
import { StatusBadge } from "./StatusBadge";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <main className="app-shell">
      <header className="app-shell__header">
        <h1 className="app-shell__title">{copy.appTitle}</h1>
        <StatusBadge tone="warning">{copy.fallbackNotice}</StatusBadge>
      </header>
      {children}
    </main>
  );
}

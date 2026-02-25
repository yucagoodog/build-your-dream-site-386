import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

interface AppShellProps {
  children: ReactNode;
  title?: string;
  headerRight?: ReactNode;
  hideNav?: boolean;
}

export function AppShell({ children, title, headerRight, hideNav }: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {title && (
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur-lg">
          <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
          {headerRight}
        </header>
      )}
      <main className="flex-1 pb-20">{children}</main>
      {!hideNav && <BottomNav />}
    </div>
  );
}

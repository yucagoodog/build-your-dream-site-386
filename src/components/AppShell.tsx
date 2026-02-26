import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

export interface AppShellProps {
  children: ReactNode;
  title?: string;
  headerLeft?: ReactNode;
  headerRight?: ReactNode;
  hideNav?: boolean;
}

export function AppShell({ children, title, headerLeft, headerRight, hideNav }: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {title && (
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur-lg">
          <div className="flex items-center gap-2">
            {headerLeft}
            <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
          </div>
          {headerRight}
        </header>
      )}
      <main className="flex-1 pb-20">{children}</main>
      {!hideNav && <BottomNav />}
    </div>
  );
}

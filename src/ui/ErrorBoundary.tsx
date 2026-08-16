/**
 * @role The one boundary between a thrown render and a blank page: it catches, says what it
 *   caught on the screen itself, and leaves the console the full error.
 * @instead A failure before React exists at all → the boot handler in src/main.tsx, which writes
 *   the same kind of message into #root. This catches only what a render throws.
 */
import { Component, type ErrorInfo, type ReactNode } from "react";

interface Caught {
  /** Null until a render below this point throws — the whole of the boundary's state. */
  readonly message: string | null;
}

/**
 * Principle 5, applied to the screen. React unmounts the whole tree under a boundary that does
 * not exist, so an uncaught render throw leaves a white page and a message only in a console
 * nobody has open — the app failing silently, which is the one thing this repo forbids. A
 * canvas app that paints from refs every frame has plenty of ways to throw with real audio
 * loaded and none while a test renders markup, so this is not a hypothetical.
 *
 * It deliberately offers no "try again": a re-render throws again, and a reload is the honest
 * recovery. Class rather than a hook because React has never shipped a hook form of this.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, Caught> {
  override state: Caught = { message: null };

  static getDerivedStateFromError(error: unknown): Caught {
    return { message: error instanceof Error ? error.message : String(error) };
  }

  override componentDidCatch(error: unknown, info: ErrorInfo): void {
    // The screen gets the message; the console keeps the stack and the component trace, which
    // are what actually locate the throw.
    console.error("mulch: a render threw", error, info.componentStack);
  }

  override render(): ReactNode {
    const { message } = this.state;
    if (message === null) return this.props.children;
    return (
      <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center gap-2 px-6 py-8">
        <h1 className="type-title">mulch stopped</h1>
        <p className="type-body text-muted-foreground">{message}</p>
        <p className="type-body text-muted-foreground">Reload to start again.</p>
      </main>
    );
  }
}

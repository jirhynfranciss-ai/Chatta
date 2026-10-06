import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Intentionally avoid leaking details to the user; keep for dev diagnostics only.
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error(error, info);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg px-6 text-center text-ink">
          <p className="text-4xl">🤍</p>
          <h1 className="font-serif-romantic text-2xl font-semibold">Something unexpected happened. 🤍</h1>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 rounded-full bg-primary px-6 py-3 text-primary-contrast transition hover:brightness-110"
          >
            Reload the page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  label: string;
};

type State = {
  hasError: boolean;
};

export class HomeSectionErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[HomeSectionErrorBoundary] ${this.props.label}`, error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return null;
    }

    return this.props.children;
  }
}

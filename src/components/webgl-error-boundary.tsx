"use client";

import { Component, type ReactNode } from "react";
import Link from "next/link";

interface WebGLErrorBoundaryProps {
  children: ReactNode;
}

interface WebGLErrorBoundaryState {
  hasError: boolean;
}

function isWebGLAvailable(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

function FallbackPanel({ message }: { message: string }) {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-black px-6">
      <div className="max-w-md rounded-xl border border-gray-700 bg-gray-900 p-8 text-center">
        <h2 className="mb-3 font-semibold text-white text-xl">
          Unable to render simulation
        </h2>
        <p className="mb-6 text-gray-300 text-sm">{message}</p>
        <Link
          href="/"
          className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 font-medium text-sm text-white transition-colors hover:bg-blue-700"
        >
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}

export class WebGLErrorBoundary extends Component<
  WebGLErrorBoundaryProps,
  WebGLErrorBoundaryState
> {
  state: WebGLErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): WebGLErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <FallbackPanel message="Something went wrong while rendering the 3D scene. Try reloading the page." />
      );
    }
    if (!isWebGLAvailable()) {
      return (
        <FallbackPanel message="Your browser or device does not support WebGL, which this simulation needs. Try a recent version of Chrome, Firefox, or Safari." />
      );
    }
    return this.props.children;
  }
}

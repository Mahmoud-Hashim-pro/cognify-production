import { lazy, Suspense } from "react";

/**
 * Thin application gate.
 *
 * The full app shell (auth, Firestore, routing, every view) lives in
 * App and is loaded as a separate chunk. This keeps firebase (~200KB
 * gzip) and the rest of the heavy runtime out of the entry chunk so the
 * landing page can start rendering sooner on slow mobile connections.
 *
 * The inline splash in index.html (#rafiqi-inline-splash) covers the screen
 * until this gate mounts; the Suspense fallback below matches its color so
 * the handoff to the code-split shell is seamless.
 */
const AppContent = lazy(() => import("./App"));

export default function AppGate() {
  return (
    <Suspense
      fallback={
        <div
          role="status"
          aria-label="Rafiqi is loading"
          style={{
            position: "fixed",
            inset: 0,
            background: "#0F172A",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        />
      }
    >
      <AppContent />
    </Suspense>
  );
}

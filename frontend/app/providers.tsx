"use client";

/**
 * React Query provider.
 *
 * TanStack Query owns all server state for the app: it caches responses,
 * deduplicates in-flight requests, and re-fetches after mutations. Components
 * should read data with `useQuery` and write with `useMutation` rather than
 * calling `fetch` themselves.
 *
 * The QueryClient is created inside `useState` so each browser session gets one
 * instance. Building it at module scope would share a single cache across
 * requests on the server, which leaks one user's data into another's response.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export default function Providers({ children }: { children: React.ReactNode }) {
  // The lazy initialiser runs once per mount; the client is then stable for the
  // lifetime of the component.
  const [client] = useState(() => new QueryClient());

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

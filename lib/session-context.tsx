"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Reaction, TrackMeta } from "./reactions";
import type { Summary } from "./summary";

/**
 * Holds everything that has to survive navigation between the router pages
 * (/ -> /details -> /session -> /summary). Mounted once in app/layout.tsx, so
 * it persists across client-side route changes — no database (decision D12).
 */
type SessionState = {
  fileUrl: string | null;
  fileName: string | null;
  /** Create an object URL for the dropped/selected file and store it. */
  loadTrack: (file: File) => void;

  meta: TrackMeta | null;
  reactions: Reaction[] | null;
  /** Save the track info + generated timeline (called from /details on success). */
  setGenerated: (meta: TrackMeta, reactions: Reaction[]) => void;

  // Cached end-of-song verdict so navigating back to /summary doesn't refetch.
  summary: Summary | null;
  setSummary: (summary: Summary) => void;
};

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [meta, setMeta] = useState<TrackMeta | null>(null);
  const [reactions, setReactions] = useState<Reaction[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);

  const loadTrack = useCallback((file: File) => {
    // Revoke the previous URL so we don't leak memory across loads.
    setFileUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setFileName(file.name);
    // A new track invalidates any prior timeline + verdict.
    setMeta(null);
    setReactions(null);
    setSummary(null);
  }, []);

  const setGenerated = useCallback((m: TrackMeta, r: Reaction[]) => {
    setMeta(m);
    setReactions(r);
    setSummary(null); // a fresh timeline invalidates an old verdict
  }, []);

  const value = useMemo(
    () => ({
      fileUrl,
      fileName,
      loadTrack,
      meta,
      reactions,
      setGenerated,
      summary,
      setSummary,
    }),
    [fileUrl, fileName, loadTrack, meta, reactions, setGenerated, summary],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionState {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside <SessionProvider>");
  return ctx;
}

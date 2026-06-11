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
import type { Room } from "./audience";
import type { Summary } from "./summary";

/**
 * Holds everything that has to survive navigation between the router pages
 * (/ -> /details -> /audience -> /session -> /summary). Mounted once in
 * app/layout.tsx, so it persists across client-side route changes (decision D12).
 */
type SessionState = {
  fileUrl: string | null;
  fileName: string | null;
  loadTrack: (file: File) => void;

  meta: TrackMeta | null;
  setMeta: (meta: TrackMeta) => void;

  room: Room | null;
  setRoom: (room: Room) => void;

  reactions: Reaction[] | null;
  setReactions: (reactions: Reaction[]) => void;

  summary: Summary | null;
  setSummary: (summary: Summary) => void;
};

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [meta, setMeta] = useState<TrackMeta | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [reactions, setReactions] = useState<Reaction[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);

  const loadTrack = useCallback((file: File) => {
    setFileUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setFileName(file.name);
    // A new track invalidates everything downstream.
    setMeta(null);
    setRoom(null);
    setReactions(null);
    setSummary(null);
  }, []);

  const value = useMemo(
    () => ({
      fileUrl,
      fileName,
      loadTrack,
      meta,
      setMeta,
      room,
      setRoom,
      reactions,
      setReactions,
      summary,
      setSummary,
    }),
    [fileUrl, fileName, loadTrack, meta, room, reactions, summary],
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

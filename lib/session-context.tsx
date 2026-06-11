"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { EnergyPoint, Reaction, TrackMeta } from "./reactions";
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
  file: File | null; // kept so we can send the audio for transcription
  loadTrack: (file: File) => void;

  lyrics: string | null; // Whisper transcript (null until transcribed / if skipped)
  setLyrics: (lyrics: string | null) => void;

  meta: TrackMeta | null;
  setMeta: (meta: TrackMeta) => void;

  room: Room | null;
  setRoom: (room: Room) => void;

  reactions: Reaction[] | null;
  setReactions: (reactions: Reaction[]) => void;

  energy: EnergyPoint[] | null;
  setEnergy: (energy: EnergyPoint[]) => void;

  summary: Summary | null;
  setSummary: (summary: Summary) => void;
};

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [lyrics, setLyrics] = useState<string | null>(null);
  const [meta, setMeta] = useState<TrackMeta | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [reactions, setReactions] = useState<Reaction[] | null>(null);
  const [energy, setEnergy] = useState<EnergyPoint[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);

  const loadTrack = useCallback((f: File) => {
    setFileUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(f);
    });
    setFileName(f.name);
    setFile(f);
    // A new track invalidates everything downstream.
    setLyrics(null);
    setMeta(null);
    setRoom(null);
    setReactions(null);
    setEnergy(null);
    setSummary(null);
  }, []);

  const value = useMemo(
    () => ({
      fileUrl,
      fileName,
      file,
      loadTrack,
      lyrics,
      setLyrics,
      meta,
      setMeta,
      room,
      setRoom,
      reactions,
      setReactions,
      energy,
      setEnergy,
      summary,
      setSummary,
    }),
    [fileUrl, fileName, file, loadTrack, lyrics, meta, room, reactions, energy, summary],
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

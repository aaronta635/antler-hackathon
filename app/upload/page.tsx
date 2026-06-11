"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session-context";

export default function UploadPage() {
  const router = useRouter();
  const { loadTrack } = useSession();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  function accept(file: File | undefined) {
    if (!file || !file.type.startsWith("audio/")) return;
    loadTrack(file);
    router.push("/details");
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="mb-8 text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Start a session</h1>
        <p className="mt-2 text-sm text-muted">Drop a track and we&apos;ll gather the room.</p>
      </div>

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          accept(e.dataTransfer.files?.[0]);
        }}
        className={`flex w-full max-w-xl cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-8 py-20 text-center transition-colors ${
          isDragging
            ? "border-accent bg-accent/10"
            : "border-stone-700 bg-surface/40 hover:border-stone-500"
        }`}
      >
        <span className="text-4xl">🎵</span>
        <span className="text-lg font-medium text-foreground">Drop a track to start</span>
        <span className="text-sm text-muted">or click to browse — MP3 or WAV</span>
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.mp3,.wav"
        onChange={(e) => accept(e.target.files?.[0])}
        className="hidden"
      />
    </main>
  );
}

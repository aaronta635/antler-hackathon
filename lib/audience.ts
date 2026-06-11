// The audience model. A "room" is a set of listeners (default + custom) plus a
// global brutality dial. The 5 hand-written defaults are the starting roster;
// users toggle them and add their own (decision D17, replacing static personas).

export const KNOWLEDGE_TYPES = [
  { id: "artist", label: "Artist / Songwriter", hears: "the writing, melody, and song structure" },
  { id: "producer", label: "Producer / Engineer", hears: "the mix, arrangement, low end, and vocal placement" },
  { id: "instrumentalist", label: "Instrumentalist", hears: "musicianship, theory, and the playing" },
  { id: "industry", label: "Industry / A&R / Curator", hears: "placement, playlists, sync, and commercial fit" },
  { id: "superfan", label: "Superfan / Scene insider", hears: "authenticity, genre references, and hype" },
  { id: "casual", label: "Casual listener", hears: "the vibe and whether it grabs them at all" },
  { id: "critic", label: "Critic / Journalist", hears: "originality and whether it's derivative" },
] as const;

export type KnowledgeId = (typeof KNOWLEDGE_TYPES)[number]["id"];
export const KNOWLEDGE_IDS = KNOWLEDGE_TYPES.map((k) => k.id) as [KnowledgeId, ...KnowledgeId[]];

export const GENRES = [
  "Pop", "Hip-Hop", "R&B", "Indie/Alt", "Rock", "Electronic", "House/Techno",
  "Drill", "Afrobeats", "Country", "Folk", "Jazz", "Metal", "Latin", "K-pop",
  "Hyperpop", "Lo-fi",
] as const;

export const CRITICALITY = [
  { id: "supportive", label: "Supportive", desc: "roots for it; praises easily" },
  { id: "balanced", label: "Balanced", desc: "fair — gives both credit and critique" },
  { id: "picky", label: "Picky", desc: "discerning; needs convincing" },
  { id: "harsh", label: "Harsh", desc: "hard to impress; quick to flag flaws" },
  { id: "brutal", label: "Brutal", desc: "savage; praise is rare and earned" },
] as const;

export type CriticalityId = (typeof CRITICALITY)[number]["id"];
export const CRITICALITY_IDS = CRITICALITY.map((c) => c.id) as [CriticalityId, ...CriticalityId[]];

export const BRUTALITY = [
  { id: "gentle", label: "Gentle", desc: "constructive and encouraging" },
  { id: "honest", label: "Honest", desc: "real talk, no sugarcoating" },
  { id: "savage", label: "Savage", desc: "brutal, roast-adjacent" },
] as const;

export type BrutalityId = (typeof BRUTALITY)[number]["id"];
export const BRUTALITY_IDS = BRUTALITY.map((b) => b.id) as [BrutalityId, ...BrutalityId[]];

export const MAX_ROOM = 6;

export type Listener = {
  id: string;
  name: string;
  age: number;
  knowledge: KnowledgeId;
  genres: string[];
  criticality: CriticalityId;
  initials: string;
  color: string;
  custom?: boolean;
  // Rich descriptors for the hand-written defaults (optional for custom listeners).
  location?: string;
  background?: string;
  discovers?: string;
  dealbreaker?: string;
  guiltyPleasure?: string;
  voice?: string;
  platform?: string;
};

export type Room = {
  listeners: Listener[];
  brutality: BrutalityId;
};

// Avatar palette for custom listeners (defaults carry their own color).
const PALETTE = ["#f59e0b", "#fb7185", "#38bdf8", "#34d399", "#c084fc", "#facc15", "#f472b6", "#22d3ee"];

export function colorForIndex(i: number): string {
  return PALETTE[i % PALETTE.length];
}

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

// The default roster — culturally-grounded, distinct voices, and now tuned to be
// harder to impress (more critical baseline per the artist's feedback).
export const DEFAULT_LISTENERS: Listener[] = [
  {
    id: "maya",
    name: "Maya",
    age: 24,
    knowledge: "casual",
    genres: ["R&B", "Pop", "Hip-Hop"],
    criticality: "picky",
    location: "Brooklyn, NY",
    background: "Runs a 30k-follower playlist and DJs warehouse parties. Grew up on Frank Ocean and SZA.",
    discovers: "TikTok FYP and friends' Story reposts",
    dealbreaker: "a chorus that doesn't pay off the build",
    guiltyPleasure: "2014 EDM festival drops",
    voice: "Texts like she's in your group chat — lowercase, fast, '??', 'ok wait', drops the subject of sentences.",
    platform: "Instagram Story (clips the 15s that hits hardest)",
    initials: "MA",
    color: "#f59e0b",
  },
  {
    id: "deshawn",
    name: "DeShawn",
    age: 31,
    knowledge: "producer",
    genres: ["Hip-Hop", "Drill", "R&B"],
    criticality: "picky",
    location: "Atlanta, GA",
    background: "Works A&R-adjacent at an indie label, makes beats. Trained ear for arrangement and mix.",
    discovers: "SoundCloud reposts and producer Discords",
    dealbreaker: "muddy low end or a vocal buried under the beat",
    guiltyPleasure: "overly-dramatic gospel chord turnarounds",
    voice: "Gives concise A&R notes — the pocket, the mix, the arrangement. Industry shorthand, no fluff.",
    platform: "a private DM to two label contacts",
    initials: "DE",
    color: "#fb7185",
  },
  {
    id: "priya",
    name: "Priya",
    age: 19,
    knowledge: "superfan",
    genres: ["K-pop", "Pop", "Hyperpop"],
    criticality: "supportive",
    location: "Toronto, ON",
    background: "Comp-sci student, full-time stan. Runs a fan account, makes fancams.",
    discovers: "TikTok and stan Twitter quote-tweets",
    dealbreaker: "anything that smells like a label-engineered 'industry plant'",
    guiltyPleasure: "early-2010s Disney Channel pop",
    voice: "all lowercase, emoji-forward, stan slang ('the way this EATS', 'not me crying'), hyperbolic but sincere.",
    platform: "TikTok (makes a transition edit to the drop)",
    initials: "PR",
    color: "#38bdf8",
  },
  {
    id: "hank",
    name: "Hank",
    age: 47,
    knowledge: "critic",
    genres: ["Indie/Alt", "Rock", "Folk"],
    criticality: "picky",
    location: "Austin, TX",
    background: "Vinyl collector, ex-college-radio DJ. Two decades of liner notes. Suspicious of anything frictionless.",
    discovers: "Bandcamp deep-dives and the record store's staff picks",
    dealbreaker: "overproduction — everything loud, no dynamics, no air",
    guiltyPleasure: "smooth 70s yacht rock",
    voice: "Chill old head who knows his stuff but keeps it casual — plain talk, maybe one quick comparison, never preachy or wordy.",
    platform: "a Reddit thread or a text to one friend — rarely shares, so it counts",
    initials: "HA",
    color: "#34d399",
  },
  {
    id: "sofia",
    name: "Sofia",
    age: 27,
    knowledge: "industry",
    genres: ["Electronic", "Pop", "House/Techno"],
    criticality: "picky",
    location: "Los Angeles, CA",
    background: "Works in sync licensing and curates fitness-class playlists. Hears every song as 'where does this place?'",
    discovers: "Spotify editorial and what soundtracks her workout classes",
    dealbreaker: "no clear energy arc — nothing to cut a scene or a set to",
    guiltyPleasure: "motivational spoken-word intros",
    voice: "Practical and placement-minded — names the scene/ad/playlist it belongs in, talks energy and tempo.",
    platform: "pitches it to a brand or a Reels creator she works with",
    initials: "SO",
    color: "#c084fc",
  },
];

const knowledgeLabel = (id: KnowledgeId) => KNOWLEDGE_TYPES.find((k) => k.id === id);
const critLabel = (id: CriticalityId) => CRITICALITY.find((c) => c.id === id);

/** A model-readable description of one room, for the system prompt. */
export function listenersPromptBlock(listeners: Listener[]): string {
  return listeners
    .map((l) => {
      const k = knowledgeLabel(l.knowledge);
      const crit = critLabel(l.criticality);
      const head = `• ${l.name} (${l.age}${l.location ? `, ${l.location}` : ""}) — ${k?.label}, ${crit?.label} (${crit?.desc})`;
      const cares = `  cares most about: ${k?.hears}. fan of: ${l.genres.join(", ") || "all kinds of music"}.`;
      if (l.voice) {
        // Rich default listener.
        return (
          `${head}\n${cares}\n` +
          `  background: ${l.background}\n` +
          `  dealbreaker: ${l.dealbreaker}; would share on: ${l.platform}\n` +
          `  WRITING VOICE (imitate exactly): ${l.voice}`
        );
      }
      // Custom listener — give the model enough to invent a believable voice.
      return (
        `${head}\n${cares}\n` +
        `  This is a custom listener the artist defined. Invent a specific, believable writing voice that fits this exact person (age, taste, knowledge, criticality) and stay in it consistently.`
      );
    })
    .join("\n\n");
}

/** The room-tone instruction, scaled by the brutality dial. Aims for a realistic MIX. */
export function toneInstruction(brutality: BrutalityId): string {
  const b = BRUTALITY.find((x) => x.id === brutality) ?? BRUTALITY[1];

  // The mix of praise vs. critique shifts with the dial; honest is the balanced default.
  const balance =
    brutality === "gentle"
      ? "Lean encouraging — mostly genuine praise, with the occasional gentle critique."
      : brutality === "savage"
        ? "Lean harsh — quick to roast, praise is rare and has to be truly earned."
        : "Aim for a realistic spread — some genuine love, some mixed, some critical. Not everyone agrees.";

  return `ROOM TONE: ${b.label} — ${b.desc}. ${balance} Also honor each listener's own criticality level shown above.

These listeners are honest, not mean. Give specific, enthusiastic praise when a moment genuinely earns it — real excitement is valuable. Be critical when something is weak (clichés, a predictable hook, muddy mix, filler), but do NOT pile on negativity by default. Every reaction must be specific to THIS track — never generic, exchangeable praise or hate.`;
}

/** Default starting room: all 5 defaults, honest tone. */
export function defaultRoom(): Room {
  return { listeners: [...DEFAULT_LISTENERS], brutality: "honest" };
}

/** Look up a listener by name within a room (for rendering avatars in the feed). */
export function listenerByName(room: Room | null, name: string): Listener | undefined {
  return room?.listeners.find((l) => l.name.toLowerCase() === name.toLowerCase());
}

// The synthetic audience. Five distinct, culturally-grounded listeners — each with
// a real archetype, a specific voice, and (per decision D9) a platform/sharing
// disposition used later for the share-ability signal in Phase 4.
//
// `color` + `initials` drive the avatar in the Phase 3 feed.

export type Persona = {
  name: string;
  age: number;
  location: string;
  background: string; // music background
  discovers: string; // how they find new music
  dealbreaker: string; // one thing that kills a song for them
  guiltyPleasure: string; // one thing they secretly love
  voice: string; // how they write — the distinct style
  platform: string; // where they'd share it, and how (share-ability signal)
  initials: string;
  color: string; // tailwind-ish hex for the avatar
};

export const PERSONAS: Persona[] = [
  {
    name: "Maya",
    age: 24,
    location: "Brooklyn, NY",
    background:
      "Runs a 30k-follower playlist and DJs warehouse parties on weekends. Grew up on Frank Ocean and SZA.",
    discovers: "TikTok FYP and friends' Instagram Story reposts",
    dealbreaker: "a chorus that doesn't pay off the build",
    guiltyPleasure: "2014 EDM festival drops",
    voice:
      "Texts like she's in your group chat — lowercase, fast, '??', 'ok wait', drops the subject of sentences.",
    platform: "Instagram Story (would clip the 15s that hits hardest)",
    initials: "MA",
    color: "#f59e0b",
  },
  {
    name: "DeShawn",
    age: 31,
    location: "Atlanta, GA",
    background:
      "Works A&R-adjacent at an indie label, makes beats. Trained ear, thinks in arrangement and mix.",
    discovers: "SoundCloud reposts and producer Discords",
    dealbreaker: "muddy low end or a vocal buried under the beat",
    guiltyPleasure: "overly-dramatic gospel chord turnarounds",
    voice:
      "Gives concise A&R notes — references the arrangement, the pocket, the mix. Industry shorthand, no fluff.",
    platform: "a private DM to two label contacts (not public — keeps an edge)",
    initials: "DE",
    color: "#fb7185",
  },
  {
    name: "Priya",
    age: 19,
    location: "Toronto, ON",
    background:
      "Comp-sci student, full-time stan. Runs a fan account, makes fancams. Lives on release-day discourse.",
    discovers: "TikTok and stan Twitter quote-tweets",
    dealbreaker: "anything that smells like a label-engineered 'industry plant'",
    guiltyPleasure: "early-2010s Disney Channel pop",
    voice:
      "all lowercase, emoji-forward, stan slang ('the way this EATS', 'not me crying'), hyperbolic and sincere.",
    platform: "TikTok (would make a transition edit to the drop)",
    initials: "PR",
    color: "#38bdf8",
  },
  {
    name: "Hank",
    age: 47,
    location: "Austin, TX",
    background:
      "Vinyl collector, ex-college-radio DJ. Two decades of liner notes. Suspicious of anything frictionless.",
    discovers: "Bandcamp deep-dives and the record store's staff picks",
    dealbreaker: "overproduction — everything loud, no dynamics, no air",
    guiltyPleasure: "smooth 70s yacht rock",
    voice:
      "Writes like a measured r/indieheads top comment — full sentences, a reference or two, earns its praise.",
    platform: "a Reddit thread or a text to one friend — rarely shares, so it counts",
    initials: "HA",
    color: "#34d399",
  },
  {
    name: "Sofia",
    age: 27,
    location: "Los Angeles, CA",
    background:
      "Works in sync licensing and curates fitness-class playlists. Hears every song as 'where does this place?'",
    discovers: "Spotify editorial and what soundtracks her workout classes",
    dealbreaker: "no clear energy arc — nothing to cut a scene or a set to",
    guiltyPleasure: "motivational spoken-word intros",
    voice:
      "Practical and placement-minded — names the scene/ad/playlist it belongs in, talks energy and tempo.",
    platform: "would pitch it to a brand or a Reels creator she works with",
    initials: "SO",
    color: "#c084fc",
  },
];

/** A compact, model-readable description of every persona for the system prompt. */
export function personasForPrompt(): string {
  return PERSONAS.map(
    (p) =>
      `• ${p.name} (${p.age}, ${p.location})\n` +
      `  background: ${p.background}\n` +
      `  discovers music via: ${p.discovers}\n` +
      `  dealbreaker: ${p.dealbreaker}\n` +
      `  guilty pleasure: ${p.guiltyPleasure}\n` +
      `  WRITING VOICE (imitate exactly): ${p.voice}\n` +
      `  would share on: ${p.platform}`,
  ).join("\n\n");
}

export const PERSONA_NAMES = PERSONAS.map((p) => p.name);

/** Look up a persona by name (case-insensitive) for rendering avatars in the feed. */
export function personaByName(name: string): Persona | undefined {
  return PERSONAS.find((p) => p.name.toLowerCase() === name.toLowerCase());
}

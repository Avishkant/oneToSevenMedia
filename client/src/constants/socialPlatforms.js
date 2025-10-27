// Centralized social platform names, metadata and helpers
export const PLATFORM_OPTIONS = [
  "YouTube",
  "Twitter/X",
  "LinkedIn",
  "Facebook",
];

export const PLATFORM_META = {
  YouTube: {
    icon: "📺",
    example: "https://www.youtube.com/channel/your-channel",
    aria: "YouTube profile URL",
  },
  "Twitter/X": {
    icon: "🕊️",
    example: "https://x.com/yourhandle",
    aria: "Twitter or X profile URL",
  },
  LinkedIn: {
    icon: "💼",
    example: "https://www.linkedin.com/in/yourprofile",
    aria: "LinkedIn profile URL",
  },
  Facebook: {
    icon: "📘",
    example: "https://www.facebook.com/yourprofile",
    aria: "Facebook profile URL",
  },
};

export function isValidUrl(value) {
  if (!value || typeof value !== "string") return false;
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

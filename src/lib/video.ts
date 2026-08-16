// Parses a raw YouTube or Vimeo URL into an embeddable player URL.
// Returns null for anything else — callers should fall back to a plain link.
export function videoEmbedSrc(url: string): string | null {
  if (!url) return null;

  const yt = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{6,})/
  );
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;

  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;

  return null;
}

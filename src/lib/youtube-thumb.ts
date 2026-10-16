/** IDs de YouTube: 11 chars habituales; acotamos para no abrir un proxy arbitrario. */
export const YOUTUBE_VIDEO_ID_RE = /^[\w-]{6,20}$/;

export function youtubeVideoIdDesdeEmbed(embedUrl: string): string | null {
  const id = embedUrl.split("/embed/")[1]?.split(/[/?#]/)[0] ?? "";
  return YOUTUBE_VIDEO_ID_RE.test(id) ? id : null;
}

export function youtubeThumbCdnUrl(id: string) {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

export function youtubeThumbAppUrl(id: string) {
  return `/api/miniatura-youtube/${encodeURIComponent(id)}`;
}

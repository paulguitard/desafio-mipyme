import { describe, expect, it } from "vitest";
import {
  youtubeThumbAppUrl,
  youtubeThumbCdnUrl,
  youtubeVideoIdDesdeEmbed,
  YOUTUBE_VIDEO_ID_RE,
} from "@/lib/youtube-thumb";

describe("youtubeVideoIdDesdeEmbed", () => {
  it("saca el id del embed", () => {
    expect(youtubeVideoIdDesdeEmbed("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("rechaza rutas o ids inválidos", () => {
    expect(youtubeVideoIdDesdeEmbed("https://www.youtube.com/embed/../etc")).toBeNull();
    expect(youtubeVideoIdDesdeEmbed("https://www.youtube.com/embed/")).toBeNull();
    expect(YOUTUBE_VIDEO_ID_RE.test("https://evil.test/x")).toBe(false);
  });
});

describe("youtubeThumb urls", () => {
  it("arma CDN y proxy same-origin", () => {
    expect(youtubeThumbCdnUrl("dQw4w9WgXcQ")).toBe("https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg");
    expect(youtubeThumbAppUrl("dQw4w9WgXcQ")).toBe("/api/miniatura-youtube/dQw4w9WgXcQ");
  });
});

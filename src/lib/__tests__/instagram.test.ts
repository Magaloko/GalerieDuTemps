// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  extractInstagramUrl,
  isValidInstagramUrl,
  instagramShortcode,
  instagramTyp,
} from "../utils/instagram";

describe("instagram.extractInstagramUrl", () => {
  it("akzeptiert reine Reel-URL", () => {
    expect(extractInstagramUrl("https://www.instagram.com/reel/DYsTivPCWiF/"))
      .toBe("https://www.instagram.com/reel/DYsTivPCWiF/");
  });

  it("strippt query-params + utm_source", () => {
    expect(extractInstagramUrl(
      "https://www.instagram.com/reel/DYsTivPCWiF/?utm_source=ig_embed&utm_campaign=loading",
    )).toBe("https://www.instagram.com/reel/DYsTivPCWiF/");
  });

  it("normalisiert /reels/ → /reel/", () => {
    expect(extractInstagramUrl("https://www.instagram.com/reels/ABC123_xyz/"))
      .toBe("https://www.instagram.com/reel/ABC123_xyz/");
  });

  it("akzeptiert /p/ (Post) und /tv/ (IGTV)", () => {
    expect(extractInstagramUrl("https://www.instagram.com/p/AbCdEf123/"))
      .toBe("https://www.instagram.com/p/AbCdEf123/");
    expect(extractInstagramUrl("https://www.instagram.com/tv/Xyz_456/"))
      .toBe("https://www.instagram.com/tv/Xyz_456/");
  });

  it("akzeptiert ohne www.", () => {
    expect(extractInstagramUrl("https://instagram.com/reel/ABC/"))
      .toBe("https://www.instagram.com/reel/ABC/");
  });

  it("extrahiert URL aus blockquote-Embed-HTML", () => {
    const embed = `<blockquote class="instagram-media" data-instgrm-permalink="https://www.instagram.com/reel/DYsTivPCWiF/?utm_source=ig_embed&amp;utm_campaign=loading" data-instgrm-version="14"><div>...</div></blockquote><script async src="//www.instagram.com/embed.js"></script>`;
    expect(extractInstagramUrl(embed)).toBe("https://www.instagram.com/reel/DYsTivPCWiF/");
  });

  it("findet URL auch in beliebigem Text-Mix", () => {
    expect(extractInstagramUrl("Schau dir das hier an: https://www.instagram.com/reel/ABC123/ ist cool"))
      .toBe("https://www.instagram.com/reel/ABC123/");
  });

  it("returns null für invalid input", () => {
    expect(extractInstagramUrl("")).toBeNull();
    expect(extractInstagramUrl("nope")).toBeNull();
    expect(extractInstagramUrl("https://twitter.com/foo")).toBeNull();
    expect(extractInstagramUrl("https://www.instagram.com/")).toBeNull();
    expect(extractInstagramUrl("https://www.instagram.com/profile_name/")).toBeNull();
  });
});

describe("isValidInstagramUrl", () => {
  it("akzeptiert kanonische URLs", () => {
    expect(isValidInstagramUrl("https://www.instagram.com/reel/ABC/")).toBe(true);
    expect(isValidInstagramUrl("https://www.instagram.com/p/XYZ/")).toBe(true);
    expect(isValidInstagramUrl("https://www.instagram.com/tv/A1B2/")).toBe(true);
  });

  it("lehnt invalide URLs ab", () => {
    expect(isValidInstagramUrl("https://twitter.com/x")).toBe(false);
    expect(isValidInstagramUrl("")).toBe(false);
    expect(isValidInstagramUrl("not a url")).toBe(false);
  });
});

describe("instagramShortcode", () => {
  it("extrahiert shortcode", () => {
    expect(instagramShortcode("https://www.instagram.com/reel/DYsTivPCWiF/"))
      .toBe("DYsTivPCWiF");
  });
  it("null bei invalid", () => {
    expect(instagramShortcode("https://twitter.com/x")).toBeNull();
  });
});

describe("instagramTyp", () => {
  it("erkennt p / reel / tv", () => {
    expect(instagramTyp("https://www.instagram.com/p/ABC/")).toBe("p");
    expect(instagramTyp("https://www.instagram.com/reel/ABC/")).toBe("reel");
    expect(instagramTyp("https://www.instagram.com/tv/ABC/")).toBe("tv");
  });
});

require("ts-node").register({
  transpileOnly: true,
  compilerOptions: {
    module: "commonjs",
    moduleResolution: "node"
  }
});

const assert = require("node:assert/strict");
const { describe, it } = require("node:test");

const { mapLesson } = require("../map.ts");

describe("mapLesson", () => {
  it("maps a YouTube lesson with a URL", () => {
    const doc = {
      _id: "yt-lesson",
      title: "Introduction",
      videoUrl: " https://youtu.be/demo ",
      durationS: "120"
    };

    const result = mapLesson(doc, "module-1");

    assert.ok(!("skip" in result));
    assert.equal(result.provider, "youtube");
    assert.equal(result.videoUrl, "https://youtu.be/demo");
    assert.equal(result.durationS, 120);
    assert.equal(result.requiresFullWatch, true);
  });

  it("skips YouTube lessons without a URL", () => {
    const doc = {
      _id: "yt-missing",
      title: "Missing URL",
      provider: "youtube"
    };

    const result = mapLesson(doc, "module-1");

    assert.deepEqual(result, { skip: true, reason: "youtube_without_url" });
  });

  it("infers Cloudflare provider when streamId is provided", () => {
    const doc = {
      _id: "cf-lesson",
      title: "Streaming",
      streamId: " stream-123 "
    };

    const result = mapLesson(doc, "module-2");

    assert.ok(!("skip" in result));
    assert.equal(result.provider, "cloudflare");
    assert.equal(result.streamId, "stream-123");
  });

  it("skips Cloudflare lessons without a streamId", () => {
    const doc = {
      _id: "cf-missing",
      title: "No Stream",
      provider: "cloudflare"
    };

    const result = mapLesson(doc, "module-2");

    assert.deepEqual(result, {
      skip: true,
      reason: "cloudflare_without_streamId"
    });
  });
});

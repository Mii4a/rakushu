import { afterEach, describe, expect, it, vi } from "vitest";

import { buildCanonicalUrl, getSiteOrigin, getSiteUrl } from "./site";

describe("official site URL", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses rakushu.app as the production origin", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://rakushu.app/");

    expect(getSiteUrl()).toBe("https://rakushu.app");
    expect(getSiteOrigin().toString()).toBe("https://rakushu.app/");
    expect(buildCanonicalUrl("/beta")).toBe("https://rakushu.app/beta");
  });

  it("defaults production builds to the official HTTPS origin", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");

    expect(getSiteUrl()).toBe("https://rakushu.app");
  });

  it("rejects non-HTTPS production origins", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://rakushu.app");

    expect(() => getSiteUrl()).toThrow("NEXT_PUBLIC_APP_URL must use https in production");
  });

  it("keeps localhost available for development", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000/");

    expect(getSiteUrl()).toBe("http://localhost:3000");
  });
});

import { describe, expect, it } from "vitest";
import { buildPublicCardUrl } from "../../app/utils/card-urls";

describe("app/utils/card-urls", () => {
  it("retire owner et employee de la query", () => {
    const url = buildPublicCardUrl("https://exemple.com", "/card", {
      email: "a@b.com",
      owner: "1",
      employee: "1",
    });
    expect(url).toBe("https://exemple.com/card?email=a%40b.com");
    expect(url).not.toContain("owner");
    expect(url).not.toContain("employee");
  });

  it("accepte un path sans query", () => {
    expect(buildPublicCardUrl("https://exemple.com", "/card", {})).toBe("https://exemple.com/card");
  });

  it("prend la première valeur si la query est un tableau", () => {
    const u = buildPublicCardUrl("https://x.test", "/", { x: ["a", "b"] });
    expect(u).toContain("x=a");
    expect(u).not.toContain("b");
  });
});

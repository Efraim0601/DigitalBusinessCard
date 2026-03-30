import { describe, expect, it } from "vitest";
import { buildPublicCardUrl, withEmployeeQuery } from "../../app/utils/card-urls";

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

  it("ignore les clés undefined et les valeurs vides", () => {
    const u = buildPublicCardUrl("https://x", "/c", { a: undefined, b: "", c: "ok" });
    expect(u).toBe("https://x/c?c=ok");
  });

  it("withEmployeeQuery ajoute employee=1", () => {
    expect(withEmployeeQuery("")).toBe("");
    expect(withEmployeeQuery("https://h/x?e=1")).toBe("https://h/x?e=1&employee=1");
    expect(withEmployeeQuery("https://h/x")).toBe("https://h/x?employee=1");
  });
});

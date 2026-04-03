import { describe, expect, it } from "vitest";
import { testH3Event } from "../helpers/h3-test-event";
import openapiHandler from "../../server/api/openapi.get";

describe("GET /api/openapi", () => {
  it("retourne un document OpenAPI 3.0 avec les chemins principaux", async () => {
    const ev = testH3Event(new Request("https://cardyo.example/api/openapi"));
    const doc = (await openapiHandler(ev)) as {
      openapi: string;
      paths: Record<string, unknown>;
    };
    expect(doc.openapi).toBe("3.0.3");
    expect(doc.paths["/api/auth/admin/login"]).toBeDefined();
    expect(doc.paths["/api/cards"]).toBeDefined();
    expect(doc.paths["/api/departments"]).toBeDefined();
    expect(doc.paths["/api/job-titles"]).toBeDefined();
    expect(doc.paths["/api/convertImage"]).toBeDefined();
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { testH3Event } from "../helpers/h3-test-event";
import convertHandler from "../../server/api/convertImage";

describe("server/api/convertImage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("400 sans paramètre url", async () => {
    const ev = testH3Event(new Request("http://localhost/api/convertImage"));
    await expect(convertHandler(ev)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("200 retourne l’image en base64", async () => {
    const buffer = new ArrayBuffer(3);
    new Uint8Array(buffer).set([10, 20, 30]);
    const fetchMock = vi.fn().mockResolvedValue(buffer);
    vi.stubGlobal("$fetch", fetchMock);
    const ev = testH3Event(
      new Request("http://localhost/api/convertImage?url=https%3A%2F%2Fexample.com%2Fa.png")
    );
    const res = (await convertHandler(ev)) as { base64: string };
    expect(res.base64).toBe(Buffer.from(new Uint8Array(buffer)).toString("base64"));
    expect(fetchMock).toHaveBeenCalled();
  });

  it("500 si le fetch distant échoue", async () => {
    vi.stubGlobal("$fetch", vi.fn().mockRejectedValue(new Error("network")));
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const ev = testH3Event(
      new Request("http://localhost/api/convertImage?url=https%3A%2F%2Fexample.com%2Fb.png")
    );
    await expect(convertHandler(ev)).rejects.toMatchObject({ statusCode: 500 });
    spy.mockRestore();
  });
});

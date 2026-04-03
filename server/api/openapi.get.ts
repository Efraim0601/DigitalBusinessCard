import { defineEventHandler, getRequestURL } from "h3";
import { buildOpenApiDocument } from "../utils/openapi-spec";

export default defineEventHandler((event) => {
  const url = getRequestURL(event);
  const base = `${url.protocol}//${url.host}`;
  setResponseHeader(event, "Content-Type", "application/json; charset=utf-8");
  setResponseHeader(event, "Cache-Control", "public, max-age=3600");
  return buildOpenApiDocument(base);
});

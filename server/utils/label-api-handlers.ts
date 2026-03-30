import {
  defineEventHandler,
  getRouterParam,
  readBody,
  setResponseStatus,
} from "h3";
import { requireAdmin } from "./admin-auth";
import {
  deleteLabelById,
  insertLabelPair,
  isPgMissingRelation,
  listLabelsPaged,
  missingRelationMessage,
  readPagedListQuery,
  updateLabelById,
  type LabelTable,
} from "./label-entities";

export function labelsListHandler(table: LabelTable) {
  return defineEventHandler(async (event) => {
    requireAdmin(event);
    return listLabelsPaged(table, readPagedListQuery(event));
  });
}

export function labelsPostHandler(table: LabelTable) {
  return defineEventHandler(async (event) => {
    requireAdmin(event);
    const body = await readBody<{ label_fr: string; label_en: string }>(event);
    if (!body?.label_fr?.trim() || !body?.label_en?.trim()) {
      setResponseStatus(event, 400);
      return { error: "label_fr and label_en are required" };
    }
    try {
      return await insertLabelPair(table, body.label_fr.trim(), body.label_en.trim());
    } catch (e: unknown) {
      if (isPgMissingRelation(e)) {
        setResponseStatus(event, 503);
        return { error: missingRelationMessage(table) };
      }
      throw e;
    }
  });
}

export function labelsPutHandler(table: LabelTable, notFoundMessage: string) {
  return defineEventHandler(async (event) => {
    requireAdmin(event);
    const id = getRouterParam(event, "id");
    if (!id) {
      setResponseStatus(event, 400);
      return { error: "id is required" };
    }
    const body = await readBody<{ label_fr?: string; label_en?: string }>(event);
    const result = await updateLabelById(table, id, body ?? {}, notFoundMessage);
    if (!result.ok) {
      setResponseStatus(event, result.status);
      return { error: result.error };
    }
    return result.row;
  });
}

export function labelsDeleteHandler(table: LabelTable, notFoundMessage: string) {
  return defineEventHandler(async (event) => {
    requireAdmin(event);
    const id = getRouterParam(event, "id");
    if (!id) {
      setResponseStatus(event, 400);
      return { error: "id is required" };
    }
    const result = await deleteLabelById(table, id, notFoundMessage);
    if (!result.ok) {
      setResponseStatus(event, result.status);
      return { error: result.error };
    }
    return { success: true };
  });
}

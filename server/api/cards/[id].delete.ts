import { query } from "../../utils/db";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) {
    setResponseStatus(event, 400);
    return { error: "id is required" };
  }

  const { rows } = await query(
    `
    DELETE FROM cards
    WHERE id = $1
    RETURNING id
  `,
    [id]
  );

  if (!rows.length) {
    setResponseStatus(event, 404);
    return { error: "Card not found" };
  }

  return { success: true };
});


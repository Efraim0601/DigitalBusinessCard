export const FIXED_PHONE = "675 878 034";
export const FIXED_FAX = "222 221 785";

export function formatGroupedNumber(value: string | null | undefined): string {
  const digits = (value ?? "").replaceAll(/\D+/g, "");
  if (!digits) return "";
  return digits.match(/.{1,3}/g)?.join(" ") ?? digits;
}


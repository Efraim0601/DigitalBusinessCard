import { getAppSettings } from "../../utils/app-settings";

export default defineEventHandler(async () => {
  return getAppSettings();
});

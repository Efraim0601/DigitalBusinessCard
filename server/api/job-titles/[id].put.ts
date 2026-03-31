import { labelsPutHandler } from "../../utils/label-api-handlers";

const putJobTitle = labelsPutHandler("job_titles", "Job title not found");
export default putJobTitle;

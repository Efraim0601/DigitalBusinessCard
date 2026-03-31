import { labelsDeleteHandler } from "../../utils/label-api-handlers";

const deleteJobTitle = labelsDeleteHandler("job_titles", "Job title not found");
export default deleteJobTitle;

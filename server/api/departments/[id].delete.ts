import { labelsDeleteHandler } from "../../utils/label-api-handlers";

const deleteDepartment = labelsDeleteHandler("departments", "Department not found");
export default deleteDepartment;

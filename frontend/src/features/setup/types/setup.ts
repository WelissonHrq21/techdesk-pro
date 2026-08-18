import type {
  CompanySettings,
  CompanySettingsFormData,
} from "../../settings/types/companySettings";
import type { User } from "../../users/types/user";

export type SetupStatus = {
  setupCompleted: boolean;
  setupCompletedAt: string | null;
  companySettings: CompanySettings | null;
  initialUsers: User[];
};

export type SetupAdminFormData = {
  name: string;
  login: string;
};

export type SetupUserFormData = Pick<User, "name" | "login"> & {
  password: string;
  role: "RECEPTION" | "TECHNICIAN";
};

export type SetupCompanyFormData = CompanySettingsFormData;

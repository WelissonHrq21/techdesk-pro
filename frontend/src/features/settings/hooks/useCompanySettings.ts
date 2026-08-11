import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  findCompanySettings,
  updateCompanySettings,
} from "../api/companySettingsApi";

export function useCompanySettings() {
  return useQuery({
    queryKey: ["company-settings"],
    queryFn: findCompanySettings,
    staleTime: 10 * 60 * 1000,
  });
}

export function useUpdateCompanySettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateCompanySettings,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["company-settings"] });
    },
  });
}

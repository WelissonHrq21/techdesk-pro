import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  completeSetup,
  createSetupUser,
  getSetupStatus,
  updateSetupAdmin,
  updateSetupCompany,
} from "../api/setupApi";

export function useSetupStatus() {
  return useQuery({
    queryKey: ["setup-status"],
    queryFn: getSetupStatus,
  });
}

export function useUpdateSetupCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateSetupCompany,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["setup-status"] });
      void queryClient.invalidateQueries({ queryKey: ["company-settings"] });
    },
  });
}

export function useUpdateSetupAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateSetupAdmin,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["setup-status"] });
      void queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useCreateSetupUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSetupUser,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["setup-status"] });
      void queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useCompleteSetup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: completeSetup,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["setup-status"] });
    },
  });
}

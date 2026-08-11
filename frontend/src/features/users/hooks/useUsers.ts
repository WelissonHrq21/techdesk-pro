import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createUser,
  deactivateUser,
  findUser,
  findUsers,
  updateUser,
} from "../api/usersApi";
import type { UserFormData } from "../types/user";

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: findUsers,
  });
}

export function useUser(id?: string) {
  return useQuery({
    queryKey: ["users", id],
    queryFn: () => findUser(id ?? ""),
    enabled: Boolean(id),
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useUpdateUser(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UserFormData) => updateUser(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["users"] });
      void queryClient.invalidateQueries({ queryKey: ["users", id] });
    },
  });
}

export function useDeactivateUser(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => deactivateUser(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["users"] });
      void queryClient.invalidateQueries({ queryKey: ["users", id] });
    },
  });
}

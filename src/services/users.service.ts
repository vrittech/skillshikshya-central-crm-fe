import { api } from "@/lib/api";
import type { Paginated, UpdateUserPayload, User, UserListParams } from "@/types";

export const usersService = {
  async list(params: UserListParams = {}) {
    const { data } = await api.get<Paginated<User>>("/users/", { params });
    return data;
  },

  /** The signed-in user with their current permissions. */
  async me() {
    const { data } = await api.get<User>("/users/me/");
    return data;
  },

  async get(id: number) {
    const { data } = await api.get<User>(`/users/${id}/`);
    return data;
  },

  async update(id: number, payload: UpdateUserPayload) {
    const { data } = await api.patch<User>(`/users/${id}/`, payload);
    return data;
  },

  async remove(id: number) {
    await api.delete(`/users/${id}/`);
  },

  /** Downloads the filtered user list as users.csv (same query params as list). */
  async exportCsv(params: Omit<UserListParams, "page" | "page_size"> = {}) {
    const { data } = await api.get<Blob>("/users/export_csv/", {
      params,
      responseType: "blob",
    });
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = "users.csv";
    a.click();
    URL.revokeObjectURL(url);
  },
};

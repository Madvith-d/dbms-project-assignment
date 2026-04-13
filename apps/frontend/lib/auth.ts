import api from "./api";
import { LoginInput, RegisterInput, User } from "@/types";

export async function loginUser(data: LoginInput): Promise<User> {
  const response = await api.post<{ user: User }>("/auth/login", data);
  return response.data.user;
}

export async function registerUser(data: RegisterInput): Promise<User> {
  const response = await api.post<{ user: User }>("/auth/register", data);
  return response.data.user;
}

export async function logoutUser(): Promise<void> {
  await api.post("/auth/logout");
}

export async function getCurrentUser(): Promise<User> {
  const response = await api.get<{ user: User }>("/auth/me");
  return response.data.user;
}

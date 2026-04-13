import api from "./api";
import { LoginInput, RegisterInput, User } from "@/types";

const MOCK_AUTH_ENABLED = process.env.NEXT_PUBLIC_USE_MOCK_AUTH === "true";
const MOCK_USER_KEY = "mock_auth_user";
const MOCK_TOKEN_KEY = "access_token";

function getMockUser(input: {
  email: string;
  first_name?: string;
  last_name?: string;
}): User {
  const role = input.email.toLowerCase().includes("admin") ? "admin" : "member";
  const now = new Date().toISOString();

  return {
    user_id: "mock-user",
    email: input.email,
    role,
    first_name: input.first_name || "Mock",
    last_name: input.last_name || "User",
    status: "active",
    created_at: now,
    updated_at: now,
  };
}

function setMockSession(user: User) {
  if (typeof window === "undefined") return;
  localStorage.setItem(MOCK_USER_KEY, JSON.stringify(user));
  document.cookie = `${MOCK_TOKEN_KEY}=mock-token; path=/`;
}

function clearMockSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(MOCK_USER_KEY);
  document.cookie = `${MOCK_TOKEN_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

export async function loginUser(data: LoginInput): Promise<User> {
  if (MOCK_AUTH_ENABLED) {
    if (!data.email || !data.password) {
      throw new Error("Email and password are required");
    }
    const user = getMockUser({ email: data.email });
    setMockSession(user);
    return user;
  }

  const response = await api.post<{ user: User }>("/auth/login", data);
  return response.data.user;
}

export async function registerUser(data: RegisterInput): Promise<User> {
  if (MOCK_AUTH_ENABLED) {
    const user = getMockUser(data);
    setMockSession(user);
    return user;
  }

  const response = await api.post<{ user: User }>("/auth/register", data);
  return response.data.user;
}

export async function logoutUser(): Promise<void> {
  if (MOCK_AUTH_ENABLED) {
    clearMockSession();
    return;
  }

  await api.post("/auth/logout");
}

export async function getCurrentUser(): Promise<User> {
  if (MOCK_AUTH_ENABLED) {
    if (typeof window === "undefined") {
      throw new Error("No mock session on server");
    }

    const rawUser = localStorage.getItem(MOCK_USER_KEY);
    if (!rawUser) {
      throw new Error("No mock session");
    }

    return JSON.parse(rawUser) as User;
  }

  const response = await api.get<{ user: User }>("/auth/me");
  return response.data.user;
}

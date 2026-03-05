// TEMPORARY: Simple authentication config
// TODO: Replace with actual backend API authentication

export const AUTH_CONFIG = {
  // Default admin credentials
  username: "admin",
  password: "admin2026",

  // Session settings
  sessionKey: "cms_session",
  sessionTimeout: 4 * 60 * 60 * 1000, // 4 hours in milliseconds
};

export interface Session {
  user: {
    id: string;
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    role: "super_admin" | "content_editor" | "publisher" | "viewer";
  };
  token: string;
  expiresAt: number;
}

// Mock user data
export const MOCK_USER = {
  id: "1",
  email: "admin@yourcompany.co.za",
  username: "admin",
  firstName: "Admin",
  lastName: "User",
  role: "super_admin" as const,
};

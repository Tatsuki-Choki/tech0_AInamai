export type UserRole = 'student' | 'teacher';

export type StoredUser = {
  name?: string;
  role?: UserRole;
};

export function getAccessToken(): string | null {
  return localStorage.getItem('access_token');
}

export function getStoredUser(): StoredUser | null {
  const raw = localStorage.getItem('user');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
}

export function setAuth(accessToken: string, user: StoredUser) {
  localStorage.setItem('access_token', accessToken);
  localStorage.setItem('user', JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('user');
}

export function isLoggedIn(): boolean {
  return Boolean(getAccessToken());
}

export function hasRole(role: UserRole): boolean {
  const u = getStoredUser();
  return u?.role === role;
}



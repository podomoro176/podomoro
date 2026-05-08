let accessToken: string | null = null;

export function getToken(): string | null { return accessToken; }
export function setToken(t: string): void { accessToken = t; }
export function clearToken(): void { accessToken = null; }

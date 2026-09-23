// Refresh tokens remain in memory; persistent renewal requires a backend cookie contract.
let refreshToken: string | undefined;

export function saveRegistrationSession(tokens: { accessToken: string; refreshToken?: string }) {
  localStorage.setItem('authToken', tokens.accessToken);
  refreshToken = tokens.refreshToken;
}

export function getRegistrationRefreshToken() {
  return localStorage.getItem('authToken') ? refreshToken : undefined;
}

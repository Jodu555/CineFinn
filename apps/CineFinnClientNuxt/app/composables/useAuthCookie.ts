const lifetimeInSeconds = 60 * 60 * 24 * 30 * 2; // 2 months
export const useAuthCookie = () => {
  return useCookie('auth-token', {
    maxAge: lifetimeInSeconds,
    expires: new Date(Date.now() + (lifetimeInSeconds * 1000)),
  });
}

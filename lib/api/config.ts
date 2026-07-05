export const apiConfig = {
  staysBaseUrl:
    process.env.NEXT_PUBLIC_STAYS_API_URL ?? "http://127.0.0.1:3002/api/v1",
  identityBaseUrl:
    process.env.NEXT_PUBLIC_IDENTITY_API_URL ?? "http://127.0.0.1:3001/api/v1",
};

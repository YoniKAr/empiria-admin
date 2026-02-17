import { Auth0Client } from "@auth0/nextjs-auth0/server";

export const auth0 = new Auth0Client({
  appBaseUrl: process.env.APP_BASE_URL,
  domain: process.env.AUTH0_ISSUER_BASE_URL?.replace("https://", ""),
  clientId: process.env.AUTH0_CLIENT_ID!,
  clientSecret: process.env.AUTH0_CLIENT_SECRET!,
  secret: process.env.AUTH0_SECRET!,
  authorizationParameters: {
    scope: "openid profile email",
  },
});

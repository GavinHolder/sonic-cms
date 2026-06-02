import prisma from "@/lib/prisma";
import { decrypt, isEncryptionConfigured } from "@/lib/crypto";

export interface GoogleCredentials {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export async function getGoogleCredentials(): Promise<GoogleCredentials> {
  const cfg = await prisma.siteConfig.findUnique({
    where: { id: "singleton" },
    select: { googleClientId: true, googleClientSecret: true, googleRedirectUri: true },
  });

  let clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? "";
  if (cfg?.googleClientSecret && isEncryptionConfigured()) {
    try { clientSecret = decrypt(cfg.googleClientSecret); } catch { /* use env fallback */ }
  }

  return {
    clientId:    cfg?.googleClientId    || process.env.GOOGLE_CLIENT_ID    || "",
    clientSecret,
    redirectUri: cfg?.googleRedirectUri || process.env.GOOGLE_REDIRECT_URI || "",
  };
}

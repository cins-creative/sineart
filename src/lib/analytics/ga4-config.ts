export type Ga4ServerConfig = {
  propertyId: string;
  clientEmail: string;
  privateKey: string;
};

/** Chuẩn hoá PEM service account — Vercel hay làm hỏng xuống dòng. */
export function normalizeGa4PrivateKey(raw: string): string {
  let key = raw.trim();
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1).trim();
  }
  key = key.replace(/\\n/g, "\n").replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  const pemMatch = key.match(/-----BEGIN (?:RSA )?PRIVATE KEY-----([\s\S]*?)-----END (?:RSA )?PRIVATE KEY-----/);
  if (!pemMatch) return key;

  const body = pemMatch[1].replace(/\s/g, "");
  if (!body) return key;

  const header = key.includes("BEGIN RSA PRIVATE KEY")
    ? "-----BEGIN RSA PRIVATE KEY-----"
    : "-----BEGIN PRIVATE KEY-----";
  const footer = key.includes("END RSA PRIVATE KEY")
    ? "-----END RSA PRIVATE KEY-----"
    : "-----END PRIVATE KEY-----";
  const lines = body.match(/.{1,64}/g) ?? [body];
  return `${header}\n${lines.join("\n")}\n${footer}\n`;
}

export function getGa4ServerConfig(): Ga4ServerConfig | null {
  const propertyId = process.env.GA4_PROPERTY_ID?.trim();
  const clientEmail = process.env.GA4_CLIENT_EMAIL?.trim();
  const rawKey = process.env.GA4_PRIVATE_KEY?.trim();
  if (!propertyId || !clientEmail || !rawKey) return null;
  const privateKey = normalizeGa4PrivateKey(rawKey);
  return { propertyId, clientEmail, privateKey };
}

export function getGa4MeasurementId(): string | null {
  const id = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID?.trim();
  return id || null;
}

export function isGa4ConfiguredForAdmin(): boolean {
  return getGa4ServerConfig() != null;
}

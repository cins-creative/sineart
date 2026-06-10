export type Ga4ServerConfig = {
  propertyId: string;
  clientEmail: string;
  privateKey: string;
};

export function getGa4ServerConfig(): Ga4ServerConfig | null {
  const propertyId = process.env.GA4_PROPERTY_ID?.trim();
  const clientEmail = process.env.GA4_CLIENT_EMAIL?.trim();
  const rawKey = process.env.GA4_PRIVATE_KEY?.trim();
  if (!propertyId || !clientEmail || !rawKey) return null;
  const privateKey = rawKey.replace(/\\n/g, "\n");
  return { propertyId, clientEmail, privateKey };
}

export function getGa4MeasurementId(): string | null {
  const id = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID?.trim();
  return id || null;
}

export function isGa4ConfiguredForAdmin(): boolean {
  return getGa4ServerConfig() != null;
}

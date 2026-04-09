export function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

const indianProfessionalProviderPhotos = [
  "https://images.unsplash.com/photo-1615109398623-88346a601842?auto=format&fit=crop&w=720&q=80",
  "https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=720&q=80",
  "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=720&q=80",
  "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=720&q=80",
  "https://images.unsplash.com/photo-1554151228-14d9def656e4?auto=format&fit=crop&w=720&q=80",
  "https://images.unsplash.com/photo-1552058544-f2b08422138a?auto=format&fit=crop&w=720&q=80",
  "https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=720&q=80",
  "https://images.unsplash.com/photo-1521119989659-a83eee488004?auto=format&fit=crop&w=720&q=80",
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=720&q=80",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=720&q=80",
  "https://images.unsplash.com/photo-1545167622-3a6ac756afa4?auto=format&fit=crop&w=720&q=80",
  "https://images.unsplash.com/photo-1580894732444-8ecded7900cd?auto=format&fit=crop&w=720&q=80",
];

const indianCustomerPortraits = [
  "https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&w=480&q=80",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=480&q=80",
  "https://images.unsplash.com/photo-1603415526960-f8f0f08b5f48?auto=format&fit=crop&w=480&q=80",
  "https://images.unsplash.com/photo-1546961329-78bef0414d7c?auto=format&fit=crop&w=480&q=80",
  "https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?auto=format&fit=crop&w=480&q=80",
  "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=480&q=80",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=480&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=480&q=80",
  "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=480&q=80",
  "https://images.unsplash.com/photo-1525134479668-1bee5c7c6845?auto=format&fit=crop&w=480&q=80",
];

function pickFromPool(seed: string, pool: string[]): string {
  return pool[hashSeed(seed) % pool.length];
}

function isGenericServicePhoto(photo: string): boolean {
  return photo.startsWith("/images/service-");
}

interface ProviderPhotoInput {
  providerId: string;
  providerName: string;
  category: string;
  photo?: string | null;
}

export function getProviderProfileImage(input: ProviderPhotoInput): string {
  const raw = String(input.photo ?? "").trim();
  if (raw && !isGenericServicePhoto(raw)) {
    return raw;
  }
  return pickFromPool(
    `provider:${input.providerId}:${input.providerName}:${input.category}`,
    indianProfessionalProviderPhotos
  );
}

export function getCustomerProfileImage(customerId: string, name = ""): string {
  return pickFromPool(`customer:${customerId}:${name}`, indianCustomerPortraits);
}

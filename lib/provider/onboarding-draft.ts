export interface ProviderOnboardingDraft {
  serviceCategory:
    | "electrician"
    | "plumber"
    | "cleaner"
    | "carpenter"
    | "appliance_repair";
  city: string;
  serviceAreaRadiusKm: number;
  yearsOfExperience: number;
  bio: string;
}

export const PROVIDER_ONBOARDING_DRAFT_KEY = "servigo_provider_onboarding_draft_v1";

export const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  Bengaluru: { lat: 12.9716, lng: 77.5946 },
  Mumbai: { lat: 19.076, lng: 72.8777 },
  Delhi: { lat: 28.6139, lng: 77.209 },
  Hyderabad: { lat: 17.385, lng: 78.4867 },
  Pune: { lat: 18.5204, lng: 73.8567 },
  Chennai: { lat: 13.0827, lng: 80.2707 },
};

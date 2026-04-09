/**
 * Shared provider constants/types that are safe to import
 * from both client components and server modules.
 */

export type ServiceCategory =
  | "electrician"
  | "plumber"
  | "cleaner"
  | "carpenter"
  | "appliance_repair";

export const SERVICE_CATEGORIES: ReadonlyArray<ServiceCategory> = [
  "electrician",
  "plumber",
  "cleaner",
  "carpenter",
  "appliance_repair",
];

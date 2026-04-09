import "server-only";
import type { ServiceCategory } from "@/lib/types/index";

const REALISTIC_NAMES: Record<ServiceCategory, string[]> = {
  electrician: ["Rajesh Kumar", "Sanjay Verma", "Rohit Sharma", "Amit Choudhary"],
  plumber: ["Imran Khan", "Naveen Kumar", "Prakash Yadav", "Arjun Negi"],
  cleaner: ["Neha Verma", "Pooja Singh", "Kavita Joshi", "Ritu Sharma"],
  carpenter: ["Manoj Yadav", "Rakesh Saini", "Vikram Reddy", "Karan Pal"],
  appliance_repair: ["Arvind Rao", "Suresh Naidu", "Deepak Mishra", "Vivek Mehta"],
};

function fallbackCategoryName(category: ServiceCategory): string {
  if (category === "appliance_repair") return "Appliance Expert";
  return category.charAt(0).toUpperCase() + category.slice(1);
}

export function normalizeProviderDisplayName(
  rawName: string,
  category: ServiceCategory,
  id: string
): string {
  const current = rawName.trim();
  if (!current) {
    const pool = REALISTIC_NAMES[category];
    return pool[id.length % pool.length];
  }
  if (!/^local\s/i.test(current)) return current;
  const pool = REALISTIC_NAMES[category];
  if (pool.length === 0) return fallbackCategoryName(category);
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return pool[hash % pool.length];
}

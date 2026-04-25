"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  BellRing,
  CalendarClock,
  ChevronRight,
  CircleCheckBig,
  CreditCard,
  Crown,
  Gift,
  Heart,
  History as HistoryIcon,
  LogOut,
  MapPin,
  Star,
  ShieldCheck,
  UserCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import CustomerRatingDisplay from "@/components/rating/CustomerRatingDisplay";
import type { UserProfile } from "@/lib/types";
import type { Address, Customer } from "@/services/firebase/types";
import {
  addCustomerAddress,
  deleteCustomerAddress,
  getCustomerAddresses,
  getCustomerProfile,
  uploadCustomerProfilePhoto,
  updateCustomerAddress,
  updateCustomerProfile,
} from "@/services/firebase/customer";
import { useCustomerStore } from "@/store/customerStore";

interface Props {
  user: UserProfile;
  handleLogout: () => Promise<void>;
  isLoggingOut: boolean;
  initialSection?: ProfileSection;
}

type ProfileSection =
  | "addresses"
  | "favorites"
  | "notifications"
  | "history"
  | "ratings"
  | "subscription"
  | "payments"
  | "referral"
  | "safety"
  | "support"
  | null;

interface HistoryBooking {
  id: string;
  providerId: string;
  providerName: string;
  providerPhoto: string;
  serviceCategory: string;
  status: "completed" | "cancelled";
  scheduledAt: string;
  address: string;
  amount: number;
}

interface ApiHistoryBooking {
  id: string;
  providerId?: string;
  providerName?: string;
  providerPhoto?: string;
  providerPhotoUpdatedAt?: string;
  serviceCategory?: string;
  status?: string;
  scheduledAt?: string;
  address?: string;
  amount?: number;
}

function withVersionedImage(url: string, version: string): string {
  if (!url || !version) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${encodeURIComponent(version)}`;
}

const emptyAddressForm = {
  id: "",
  label: "Home",
  line1: "",
  line2: "",
  city: "",
  state: "",
  pincode: "",
  landmark: "",
  lat: "",
  lng: "",
  isDefault: false,
};

export default function DashboardProfile({
  user,
  handleLogout,
  isLoggingOut,
  initialSection = null,
}: Props) {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<ProfileSection>(null);
  const [profile, setProfile] = useState<Customer | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [photoUploading, setPhotoUploading] = useState(false);
  const [subscriptionSaving, setSubscriptionSaving] = useState(false);
  const [referralSaving, setReferralSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [addressSaving, setAddressSaving] = useState(false);
  const [addressError, setAddressError] = useState("");
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressForm, setAddressForm] = useState(emptyAddressForm);
  const [upiId, setUpiId] = useState("");
  const [cardHolderName, setCardHolderName] = useState("");
  const [cardLast4, setCardLast4] = useState("");
  const [paymentUiMessage, setPaymentUiMessage] = useState("");
  const [historyBookings, setHistoryBookings] = useState<HistoryBooking[]>([]);
  const [historyFilter, setHistoryFilter] = useState<"all" | "completed" | "cancelled">("all");
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const notifications = useCustomerStore((state) => state.notifications);
  const markNotificationRead = useCustomerStore((state) => state.markNotificationRead);
  const favorites = useCustomerStore((state) => state.favorites);
  const isLoadingFavorites = useCustomerStore((state) => state.isLoadingFavorites);
  const favoritesError = useCustomerStore((state) => state.favoritesError);
  const fetchFavorites = useCustomerStore((state) => state.fetchFavorites);
  const removeFromFavorites = useCustomerStore((state) => state.removeFromFavorites);
  const unreadCount = notifications.filter((item) => item.read !== true).length;

  const profileName = profile?.name || user?.name || "Customer";
  const profileEmail = profile?.email || user?.email || "";
  const filteredHistory = useMemo(() => {
    if (historyFilter === "all") return historyBookings;
    return historyBookings.filter((item) => item.status === historyFilter);
  }, [historyBookings, historyFilter]);

  useEffect(() => {
    if (initialSection) {
      setActiveSection(initialSection);
    }
  }, [initialSection]);

  useEffect(() => {
    if (!user?.uid) return;
    void fetchFavorites();
  }, [fetchFavorites, user?.uid]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        setProfileLoading(true);
        setProfileError("");
        const [profileData, rows] = await Promise.all([
          getCustomerProfile(user.uid),
          getCustomerAddresses(user.uid),
        ]);
        if (cancelled) return;
        setProfile(profileData);
        setAddresses(rows);
      } catch (error: unknown) {
        if (!cancelled) {
          setProfileError(
            error instanceof Error ? error.message : "Failed to load profile."
          );
        }
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user.uid]);

  useEffect(() => {
    if (activeSection !== "history") return;
    let cancelled = false;
    void (async () => {
      try {
        setHistoryLoading(true);
        setHistoryError("");
        const res = await fetch("/api/bookings", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.error ?? "Failed to load history.");
        }
        const rows: ApiHistoryBooking[] = Array.isArray(data.bookings) ? data.bookings : [];
        const mapped: HistoryBooking[] = rows
          .map((row) => ({
            id: String(row.id ?? ""),
            providerId: String(row.providerId ?? ""),
            providerName: String(row.providerName ?? "Provider"),
            providerPhoto: withVersionedImage(
              String(row.providerPhoto ?? ""),
              String(row.providerPhotoUpdatedAt ?? "")
            ),
            serviceCategory: String(row.serviceCategory ?? "service"),
            status:
              row.status === "completed"
                ? "completed"
                : row.status === "cancelled"
                ? "cancelled"
                : null,
            scheduledAt: String(row.scheduledAt ?? ""),
            address: String(row.address ?? "Home Service"),
            amount: Number(row.amount ?? 0),
          }))
          .filter(
            (row): row is HistoryBooking =>
              Boolean(row.id) && (row.status === "completed" || row.status === "cancelled")
          );
        if (!cancelled) {
          setHistoryBookings(mapped);
        }
      } catch (error: unknown) {
        if (!cancelled) {
          setHistoryError(
            error instanceof Error ? error.message : "Failed to load booking history."
          );
        }
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeSection]);

  async function refreshAddresses() {
    setAddressesLoading(true);
    try {
      const rows = await getCustomerAddresses(user.uid);
      setAddresses(rows);
    } catch (error: unknown) {
      setAddressError(
        error instanceof Error ? error.message : "Failed to load addresses."
      );
    } finally {
      setAddressesLoading(false);
    }
  }

  async function handleProfileSave() {
    try {
      setProfileSaving(true);
      setProfileError("");
      setProfileMessage("");
      await updateCustomerProfile(user.uid, {
        name: profile?.name ?? profileName,
        phone: profile?.phone ?? "",
        photoUrl: profile?.photoUrl ?? "",
      });
      const updated = await getCustomerProfile(user.uid);
      setProfile(updated);
      setProfileMessage("Profile updated successfully.");
    } catch (error: unknown) {
      setProfileError(
        error instanceof Error ? error.message : "Failed to save profile."
      );
    } finally {
      setProfileSaving(false);
    }
  }

  async function handlePhotoUpload(file: File | null) {
    if (!file) return;
    try {
      setPhotoUploading(true);
      setProfileError("");
      setProfileMessage("");
      const photoUrl = await uploadCustomerProfilePhoto(user.uid, file);
      await updateCustomerProfile(user.uid, { photoUrl });
      const updated = await getCustomerProfile(user.uid);
      setProfile(updated);
      setProfileMessage("Profile photo updated.");
    } catch (error: unknown) {
      setProfileError(
        error instanceof Error ? error.message : "Failed to upload photo."
      );
    } finally {
      setPhotoUploading(false);
    }
  }

  async function handleSubscriptionChange(plan: "basic" | "family" | "premium") {
    try {
      setSubscriptionSaving(true);
      setProfileError("");
      await updateCustomerProfile(user.uid, { subscriptionPlan: plan });
      const updated = await getCustomerProfile(user.uid);
      setProfile(updated);
    } catch (error: unknown) {
      setProfileError(
        error instanceof Error ? error.message : "Failed to update subscription."
      );
    } finally {
      setSubscriptionSaving(false);
    }
  }

  async function handleGenerateReferralCode() {
    try {
      setReferralSaving(true);
      setProfileError("");
      const generated = `SVG${user.uid.slice(0, 4).toUpperCase()}${Date.now().toString().slice(-4)}`;
      await updateCustomerProfile(user.uid, { referralCode: generated });
      const updated = await getCustomerProfile(user.uid);
      setProfile(updated);
    } catch (error: unknown) {
      setProfileError(
        error instanceof Error ? error.message : "Failed to generate referral code."
      );
    } finally {
      setReferralSaving(false);
    }
  }

  async function handleShareReferralCode() {
    const code = profile?.referralCode?.trim();
    if (!code) return;
    const message = `Join ServiGo with my referral code: ${code}`;
    try {
      const nav = typeof window !== "undefined" ? window.navigator : undefined;
      if (nav && typeof nav.share === "function") {
        await nav.share({ title: "ServiGo Referral", text: message });
      } else if (nav?.clipboard) {
        await nav.clipboard.writeText(message);
        setProfileMessage("Referral code copied to clipboard.");
      }
    } catch {
      // no-op: user can still copy manually
    }
  }

  async function handleAddressSubmit() {
    try {
      setAddressSaving(true);
      setAddressError("");
      const lat = Number(addressForm.lat);
      const lng = Number(addressForm.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        throw new Error("Address must include valid lat/lng coordinates.");
      }

      if (editingAddressId) {
        await updateCustomerAddress(user.uid, editingAddressId, {
          label: addressForm.label,
          line1: addressForm.line1,
          line2: addressForm.line2,
          city: addressForm.city,
          state: addressForm.state,
          pincode: addressForm.pincode,
          landmark: addressForm.landmark,
          lat,
          lng,
          isDefault: addressForm.isDefault,
        });
      } else {
        await addCustomerAddress(user.uid, {
          id: "",
          label: addressForm.label,
          line1: addressForm.line1,
          line2: addressForm.line2 || undefined,
          city: addressForm.city,
          state: addressForm.state,
          pincode: addressForm.pincode,
          landmark: addressForm.landmark || undefined,
          lat,
          lng,
          isDefault: addressForm.isDefault,
        });
      }

      setAddressForm(emptyAddressForm);
      setEditingAddressId(null);
      await refreshAddresses();
    } catch (error: unknown) {
      setAddressError(
        error instanceof Error ? error.message : "Failed to save address."
      );
    } finally {
      setAddressSaving(false);
    }
  }

  async function handleAddressDelete(addressId: string) {
    try {
      setAddressError("");
      await deleteCustomerAddress(user.uid, addressId);
      await refreshAddresses();
    } catch (error: unknown) {
      setAddressError(
        error instanceof Error ? error.message : "Failed to delete address."
      );
    }
  }

  const sectionItems = useMemo(
    () => [
      {
        key: "addresses" as const,
        icon: MapPin,
        title: "Saved Addresses",
        description: "Manage your frequently used locations",
      },
      {
        key: "favorites" as const,
        icon: Heart,
        title: favorites.length > 0 ? `Favorites (${favorites.length})` : "Favorites",
        description: "Saved workers for faster rebooking",
      },
      {
        key: "notifications" as const,
        icon: BellRing,
        title: unreadCount > 0 ? `Notifications (${unreadCount})` : "Notifications",
        description: "Control booking and status alerts",
      },
      {
        key: "history" as const,
        icon: HistoryIcon,
        title: "Booking History",
        description: "See completed and cancelled bookings",
      },
      {
        key: "ratings" as const,
        icon: Star,
        title: "My Ratings",
        description: "See feedback workers left on your bookings",
      },
      {
        key: "subscription" as const,
        icon: Crown,
        title: "Subscription Plans",
        description: "Choose Basic, Family, or Premium",
      },
      {
        key: "payments" as const,
        icon: CreditCard,
        title: "Payment Methods",
        description: "Add UPI and card details (MVP UI)",
      },
      {
        key: "referral" as const,
        icon: Gift,
        title: "Referral Code",
        description: "Generate and share your referral",
      },
      {
        key: "safety" as const,
        icon: CircleCheckBig,
        title: "Safety Settings",
        description: "Emergency contacts and report center",
      },
      {
        key: "support" as const,
        icon: ShieldCheck,
        title: "Help & Support",
        description: "FAQs and grievance escalation",
      },
    ],
    [favorites.length, unreadCount]
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-6">
      <div className="rounded-2xl border border-border/70 bg-card/85 p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Profile</p>
        <div className="mt-3 rounded-2xl border border-border/70 bg-background p-4 sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center overflow-hidden rounded-full bg-muted text-muted-foreground">
                {profile?.photoUrl ? (
                  <Image
                    src={profile.photoUrl}
                    alt={profileName}
                    width={48}
                    height={48}
                    className="h-full w-full object-cover"
                    unoptimized
                  />
                ) : (
                  <UserCircle2 size={24} />
                )}
              </span>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{profileName}</h1>
                <p className="mt-0.5 text-sm text-muted-foreground">{profileEmail}</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
              <ShieldCheck size={14} />
              Verified Customer
            </span>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-border/70 bg-background p-4">
          <p className="text-sm font-semibold text-foreground">Edit Profile</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
            <Input
              value={profile?.photoUrl ?? ""}
              onChange={(e) =>
                setProfile((prev) => ({
                  uid: user.uid,
                  name: prev?.name ?? profileName,
                  email: prev?.email ?? profileEmail,
                  phone: prev?.phone,
                  photoUrl: e.target.value,
                }))
              }
              placeholder="Profile photo URL"
            />
            <label className="inline-flex h-10 cursor-pointer items-center justify-center rounded-lg border border-border px-3 text-sm text-foreground hover:bg-muted">
              Upload
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => void handlePhotoUpload(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Input
              value={profile?.name ?? profileName}
              onChange={(e) =>
                setProfile((prev) => ({
                  uid: user.uid,
                  name: e.target.value,
                  email: prev?.email ?? profileEmail,
                  phone: prev?.phone,
                }))
              }
              placeholder="Full name"
            />
            <Input
              value={profile?.phone ?? ""}
              onChange={(e) =>
                setProfile((prev) => ({
                  uid: user.uid,
                  name: prev?.name ?? profileName,
                  email: prev?.email ?? profileEmail,
                  phone: e.target.value,
                }))
              }
              placeholder="Phone number"
            />
          </div>
          <Button
            variant="outline"
            className="mt-3 h-9 rounded-lg"
            onClick={() => void handleProfileSave()}
            disabled={profileSaving || profileLoading || photoUploading}
          >
            {profileSaving ? "Saving..." : photoUploading ? "Uploading photo..." : "Save Profile"}
          </Button>
          {profileMessage ? (
            <p className="mt-2 text-xs text-emerald-700">{profileMessage}</p>
          ) : null}
          {profileError ? (
            <p className="mt-2 text-xs text-red-600">{profileError}</p>
          ) : null}
        </div>

        <div className="mt-4 space-y-2">
          {sectionItems.map((item) => (
            <button
              key={item.title}
              onClick={() =>
                setActiveSection((prev) => (prev === item.key ? null : item.key))
              }
              className="flex w-full items-center justify-between rounded-xl border border-border/70 bg-background px-4 py-3 text-left transition hover:border-foreground/30 hover:bg-muted/60"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-muted text-muted-foreground">
                  <item.icon size={16} />
                </span>
                <div>
                  <p className="font-semibold text-foreground">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-muted-foreground" />
            </button>
          ))}
        </div>

        {activeSection === "addresses" ? (
          <div className="mt-4 rounded-xl border border-border/70 bg-background p-4">
            <p className="text-sm font-semibold text-foreground">Address Book</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Input
                value={addressForm.label}
                onChange={(e) =>
                  setAddressForm((prev) => ({ ...prev, label: e.target.value }))
                }
                placeholder="Label (Home/Office)"
              />
              <Input
                value={addressForm.line1}
                onChange={(e) =>
                  setAddressForm((prev) => ({ ...prev, line1: e.target.value }))
                }
                placeholder="Address line 1"
              />
              <Input
                value={addressForm.line2}
                onChange={(e) =>
                  setAddressForm((prev) => ({ ...prev, line2: e.target.value }))
                }
                placeholder="Address line 2 (optional)"
              />
              <Input
                value={addressForm.city}
                onChange={(e) =>
                  setAddressForm((prev) => ({ ...prev, city: e.target.value }))
                }
                placeholder="City"
              />
              <Input
                value={addressForm.state}
                onChange={(e) =>
                  setAddressForm((prev) => ({ ...prev, state: e.target.value }))
                }
                placeholder="State"
              />
              <Input
                value={addressForm.pincode}
                onChange={(e) =>
                  setAddressForm((prev) => ({ ...prev, pincode: e.target.value }))
                }
                placeholder="Pincode"
              />
              <Input
                value={addressForm.landmark}
                onChange={(e) =>
                  setAddressForm((prev) => ({ ...prev, landmark: e.target.value }))
                }
                placeholder="Landmark (optional)"
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={addressForm.lat}
                  onChange={(e) =>
                    setAddressForm((prev) => ({ ...prev, lat: e.target.value }))
                  }
                  placeholder="Latitude"
                />
                <Input
                  value={addressForm.lng}
                  onChange={(e) =>
                    setAddressForm((prev) => ({ ...prev, lng: e.target.value }))
                  }
                  placeholder="Longitude"
                />
              </div>
            </div>
            <label className="mt-3 inline-flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={addressForm.isDefault}
                onChange={(e) =>
                  setAddressForm((prev) => ({ ...prev, isDefault: e.target.checked }))
                }
              />
              Set as default
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="h-9 rounded-lg"
                onClick={() => void handleAddressSubmit()}
                disabled={addressSaving}
              >
                {addressSaving
                  ? "Saving..."
                  : editingAddressId
                  ? "Update Address"
                  : "Add Address"}
              </Button>
              {editingAddressId ? (
                <Button
                  variant="outline"
                  className="h-9 rounded-lg"
                  onClick={() => {
                    setEditingAddressId(null);
                    setAddressForm(emptyAddressForm);
                  }}
                >
                  Cancel Edit
                </Button>
              ) : null}
            </div>

            {addressError ? (
              <p className="mt-2 text-xs text-red-600">{addressError}</p>
            ) : null}

            <div className="mt-4 space-y-2">
              {addressesLoading ? (
                <p className="text-sm text-muted-foreground">Loading addresses...</p>
              ) : addresses.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No saved addresses yet.
                </p>
              ) : (
                addresses.map((address) => (
                  <div
                    key={address.id}
                    className="rounded-lg border border-border/70 bg-card p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {address.label || "Address"}{" "}
                          {address.isDefault ? (
                            <span className="text-xs text-emerald-600">(Default)</span>
                          ) : null}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {address.line1}
                          {address.line2 ? `, ${address.line2}` : ""}, {address.city},{" "}
                          {address.state} - {address.pincode}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          className="h-8 rounded-md px-2 text-xs"
                          onClick={() => {
                            setEditingAddressId(address.id);
                            setAddressForm({
                              id: address.id,
                              label: address.label ?? "Home",
                              line1: address.line1,
                              line2: address.line2 ?? "",
                              city: address.city,
                              state: address.state,
                              pincode: address.pincode,
                              landmark: address.landmark ?? "",
                              lat: String(address.lat),
                              lng: String(address.lng),
                              isDefault: address.isDefault,
                            });
                          }}
                        >
                          Edit
                        </Button>
                        {!address.isDefault ? (
                          <Button
                            variant="outline"
                            className="h-8 rounded-md px-2 text-xs"
                            onClick={() =>
                              void (async () => {
                                await updateCustomerAddress(user.uid, address.id, {
                                  isDefault: true,
                                  lat: address.lat,
                                  lng: address.lng,
                                });
                                await refreshAddresses();
                              })()
                            }
                          >
                            Set Default
                          </Button>
                        ) : null}
                        <Button
                          variant="outline"
                          className="h-8 rounded-md px-2 text-xs text-red-600"
                          onClick={() => void handleAddressDelete(address.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : null}

        {activeSection === "favorites" ? (
          <div className="mt-4 rounded-xl border border-border/70 bg-background p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">Favorite Workers</p>
              <Button
                variant="outline"
                className="h-8 rounded-md px-2 text-xs"
                onClick={() => void fetchFavorites()}
              >
                Refresh
              </Button>
            </div>
            <div className="mt-3 space-y-2">
              {isLoadingFavorites ? (
                <p className="text-sm text-muted-foreground">Loading favorites...</p>
              ) : favorites.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  You haven&apos;t saved any workers yet.
                </p>
              ) : (
                favorites.map((worker) => (
                  <div
                    key={worker.id}
                    className="rounded-lg border border-border/70 bg-card p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{worker.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {worker.serviceCategory.replaceAll("_", " ")} • {worker.rating.toFixed(1)} ★
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          className="h-8 rounded-md px-2 text-xs"
                          onClick={() =>
                            router.push(
                              `/provider/${worker.id}?from=${encodeURIComponent("/dashboard?tab=profile")}`
                            )
                          }
                        >
                          Quick Rebook
                        </Button>
                        <Button
                          variant="outline"
                          className="h-8 rounded-md px-2 text-xs text-red-600"
                          onClick={() => void removeFromFavorites(worker.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
              {favoritesError ? (
                <p className="text-xs text-red-600">{favoritesError}</p>
              ) : null}
            </div>
          </div>
        ) : null}

        {activeSection === "notifications" ? (
          <div className="mt-4 rounded-xl border border-border/70 bg-background p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">Notifications</p>
              {unreadCount > 0 ? (
                <Button
                  variant="outline"
                  className="h-8 rounded-md px-2 text-xs"
                  onClick={() => {
                    notifications
                      .filter((item) => item.read !== true)
                      .forEach((item) => void markNotificationRead(item.id));
                  }}
                >
                  Mark all as read
                </Button>
              ) : null}
            </div>
            <div className="mt-3 space-y-2">
              {notifications.length === 0 ? (
                <p className="text-sm text-muted-foreground">No notifications yet.</p>
              ) : (
                notifications.map((notification) => {
                  const tone =
                    notification.type === "booking_update"
                      ? "border-sky-200 bg-sky-50"
                      : notification.type === "promotion"
                      ? "border-emerald-200 bg-emerald-50"
                      : notification.type === "safety"
                      ? "border-amber-200 bg-amber-50"
                      : "border-border/70 bg-card";

                  return (
                    <button
                      key={notification.id}
                      onClick={() => void markNotificationRead(notification.id)}
                      className={`w-full rounded-lg border p-3 text-left transition hover:opacity-90 ${tone} ${
                        notification.read ? "opacity-75" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground">
                          {notification.title || "Notification"}
                        </p>
                        {!notification.read ? (
                          <span className="rounded-full bg-foreground px-2 py-0.5 text-[10px] font-semibold text-background">
                            New
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {notification.message || "You have a new update."}
                      </p>
                      <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                        {notification.type.replace("_", " ")}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        ) : null}

        {activeSection === "history" ? (
          <div className="mt-4 rounded-xl border border-border/70 bg-background p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">Booking History</p>
              <div className="flex flex-nowrap gap-1 overflow-x-auto rounded-lg border border-border p-1">
                {(["all", "completed", "cancelled"] as const).map((key) => (
                  <button
                    key={key}
                    onClick={() => setHistoryFilter(key)}
                    className={`min-w-0 flex-1 whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium capitalize transition ${
                      historyFilter === key
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {key}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-3 space-y-2">
              {historyLoading ? (
                <p className="text-sm text-muted-foreground">Loading history...</p>
              ) : null}
              {historyError ? (
                <p className="text-xs text-red-600">{historyError}</p>
              ) : null}
              {!historyLoading && !historyError && filteredHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">No history items found.</p>
              ) : null}
              {filteredHistory.map((booking) => (
                <div
                  key={booking.id}
                  className="rounded-lg border border-border/70 bg-card p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-muted">
                        {booking.providerPhoto ? (
                          <Image
                            src={booking.providerPhoto}
                            alt={booking.providerName}
                            width={40}
                            height={40}
                            className="h-full w-full object-cover"
                            unoptimized
                          />
                        ) : (
                          <UserCircle2 size={18} className="text-muted-foreground" />
                        )}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{booking.providerName}</p>
                        <p className="text-xs capitalize text-muted-foreground">
                          {booking.serviceCategory.replaceAll("_", " ")}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        booking.status === "completed"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {booking.status}
                    </span>
                  </div>
                  <div className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-3">
                    <p className="inline-flex items-center gap-1">
                      <CalendarClock size={13} />
                      {booking.scheduledAt
                        ? new Date(booking.scheduledAt).toLocaleString()
                        : "-"}
                    </p>
                    <p className="truncate">{booking.address || "Home Service"}</p>
                    <p className="font-medium text-foreground">Rs {booking.amount || 0}</p>
                  </div>
                  <div className="mt-2">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        className="h-8 rounded-md px-3 text-xs"
                        onClick={() =>
                          router.push(
                            `/bookings/${booking.id}?from=${encodeURIComponent(
                              "/dashboard?tab=profile&section=history"
                            )}`
                          )
                        }
                      >
                        View Details
                      </Button>
                      {booking.status === "completed" ? (
                        <Button
                          className="h-8 rounded-md bg-emerald-600 px-3 text-xs text-white hover:bg-emerald-700"
                          onClick={() => router.push(`/reviews/${booking.id}`)}
                        >
                          Write Review
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {activeSection === "ratings" ? (
          <div className="mt-4 rounded-xl border border-border/70 bg-background p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">My Ratings</p>
              <span className="text-xs text-muted-foreground">
                Feedback left by workers after completed bookings
              </span>
            </div>
            <div className="mt-3">
              <CustomerRatingDisplay customerId={user.uid} />
            </div>
          </div>
        ) : null}

        {activeSection === "subscription" ? (
          <div className="mt-4 rounded-xl border border-border/70 bg-background p-4">
            <p className="text-sm font-semibold text-foreground">Subscription Plans</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {[
                { key: "basic", title: "Basic", price: "Rs 199", detail: "Essential coverage for solo use" },
                { key: "family", title: "Family", price: "Rs 499", detail: "Priority support for households" },
                { key: "premium", title: "Premium", price: "Rs 999", detail: "Fastest support + premium protections" },
              ].map((plan) => {
                const selected = profile?.subscriptionPlan === plan.key;
                return (
                  <button
                    key={plan.key}
                    onClick={() =>
                      void handleSubscriptionChange(plan.key as "basic" | "family" | "premium")
                    }
                    disabled={subscriptionSaving}
                    className={`rounded-lg border p-3 text-left transition ${
                      selected
                        ? "border-emerald-300 bg-emerald-50"
                        : "border-border/70 bg-card hover:bg-muted/60"
                    }`}
                  >
                    <p className="text-sm font-semibold text-foreground">{plan.title}</p>
                    <p className="text-xs text-muted-foreground">{plan.price}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{plan.detail}</p>
                    {selected ? (
                      <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                        Current Plan
                      </p>
                    ) : null}
                  </button>
                );
              })}
            </div>
            {subscriptionSaving ? (
              <p className="mt-2 text-xs text-muted-foreground">Updating subscription...</p>
            ) : null}
          </div>
        ) : null}

        {activeSection === "payments" ? (
          <div className="mt-4 rounded-xl border border-border/70 bg-background p-4">
            <p className="text-sm font-semibold text-foreground">Payment Methods (MVP UI)</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Input
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="UPI ID (example@upi)"
              />
              <Input
                value={cardHolderName}
                onChange={(e) => setCardHolderName(e.target.value)}
                placeholder="Card holder name"
              />
              <Input
                value={cardLast4}
                onChange={(e) => setCardLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="Card last 4 digits"
              />
            </div>
            <Button
              variant="outline"
              className="mt-3 h-9 rounded-lg"
              onClick={() => setPaymentUiMessage("Payment method saved locally for MVP UI.")}
            >
              Save Payment Method
            </Button>
            {paymentUiMessage ? (
              <p className="mt-2 text-xs text-muted-foreground">{paymentUiMessage}</p>
            ) : null}
          </div>
        ) : null}

        {activeSection === "referral" ? (
          <div className="mt-4 rounded-xl border border-border/70 bg-background p-4">
            <p className="text-sm font-semibold text-foreground">Referral Program</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Share your code with friends and earn rewards when they complete their first booking.
            </p>
            <div className="mt-3 rounded-lg border border-border bg-card p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Your Referral Code</p>
              <p className="mt-1 text-base font-semibold text-foreground">
                {profile?.referralCode?.trim() || "Not generated yet"}
              </p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="h-9 rounded-lg"
                onClick={() => void handleGenerateReferralCode()}
                disabled={referralSaving}
              >
                {referralSaving ? "Generating..." : "Generate Code"}
              </Button>
              <Button
                variant="outline"
                className="h-9 rounded-lg"
                onClick={() => void handleShareReferralCode()}
                disabled={!profile?.referralCode}
              >
                Share Code
              </Button>
            </div>
          </div>
        ) : null}

        {activeSection === "safety" ? (
          <div className="mt-4 rounded-xl border border-border/70 bg-background p-4">
            <p className="text-sm text-muted-foreground">
              Safety settings module is ready for emergency contacts and dispute controls.
            </p>
          </div>
        ) : null}

        {activeSection === "support" ? (
          <div className="mt-4 rounded-xl border border-border/70 bg-background p-4">
            <p className="text-sm text-muted-foreground">
              For now, use Help & Support from contact options while we expand in-app support.
            </p>
          </div>
        ) : null}

        <Button
          variant="outline"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="mt-6 h-11 w-full rounded-xl border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
        >
          <LogOut size={16} className="mr-2" />
          {isLoggingOut ? "Signing Out..." : "Sign Out"}
        </Button>
      </div>
    </div>
  );
}

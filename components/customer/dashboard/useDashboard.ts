"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import type { ServiceCategory } from "@/lib/types/index";
import type { RadiusOption } from "@/components/customer/shared/types";
import { buildAuthHref } from "@/lib/auth/callback-url";

type BookingViewFilter = "pending" | "confirmed" | "cancelled";
type ProviderSort = "recommended" | "nearest" | "rating" | "price";
type ProfileSection =
  | "addresses"
  | "favorites"
  | "notifications"
  | "history"
  | "safety"
  | "support"
  | null;

export function useDashboard() {
  // FIX: Include 'loading' from the Auth Context
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeTab = searchParams?.get("tab") ?? "home";
  const queryCategory = searchParams?.get("category") ?? "";
  const querySearch = searchParams?.get("search") ?? "";
  const popupType = searchParams?.get("popup") ?? "";
  const popupBookingId = searchParams?.get("bookingId") ?? "";
  const profileSectionParam = searchParams?.get("section") ?? "";
  const initialProfileSection: ProfileSection =
    profileSectionParam === "addresses" ||
    profileSectionParam === "favorites" ||
    profileSectionParam === "notifications" ||
    profileSectionParam === "history" ||
    profileSectionParam === "safety" ||
    profileSectionParam === "support"
      ? profileSectionParam
      : null;

  // FIX: isGuest is only true if we aren't loading AND there is no user
  const isGuest = !loading && !user;

  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | "All">(() => {
    const allowed: ServiceCategory[] = [
      "electrician", "plumber", "cleaner", "carpenter", "appliance_repair",
    ];
    return allowed.includes(queryCategory as ServiceCategory)
      ? (queryCategory as ServiceCategory)
      : "All";
  });

  const [selectedRadius, setSelectedRadius] = useState<RadiusOption>(5);
  const [bookingFilter, setBookingFilter] = useState<BookingViewFilter>("pending");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [searchQuery, setSearchQuery] = useState(querySearch);
  const [showFilters, setShowFilters] = useState(false);
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [femaleOnly, setFemaleOnly] = useState(false);
  const [rating45Plus, setRating45Plus] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(true);
  const [sortBy, setSortBy] = useState<ProviderSort>("recommended");
  const [isActionPopupOpen, setIsActionPopupOpen] = useState(false);
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);

  useEffect(() => {
    const allowed: ServiceCategory[] = [
      "electrician", "plumber", "cleaner", "carpenter", "appliance_repair",
    ];
    if (allowed.includes(queryCategory as ServiceCategory)) {
      setSelectedCategory(queryCategory as ServiceCategory);
    } else {
      setSelectedCategory("All");
    }
    setSearchQuery(querySearch);
  }, [queryCategory, querySearch]);

  useEffect(() => {
    setIsActionPopupOpen(popupType === "booked" || popupType === "cancelled");
  }, [popupType]);

  useEffect(() => {
    // FIX: Only check role if loading is complete and user exists
    if (!loading && user && user.role !== "user") {
      router.replace("/unauthorized");
    }
  }, [router, user, loading]);

  useEffect(() => {
    // FIX: Only redirect to login if loading is finished and it's definitely a guest
    if (!loading && isGuest && activeTab !== "home") {
      router.replace(
        buildAuthHref("/auth/login", { callbackUrl: "/dashboard?tab=home" })
      );
    }
  }, [activeTab, isGuest, loading, router]);

  const closeActionPopup = useCallback(() => {
    setIsActionPopupOpen(false);
    router.replace(`/dashboard?tab=${activeTab}`);
  }, [activeTab, router]);

  const handleLogout = useCallback(async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      router.push("/auth/login");
    } finally {
      setIsLoggingOut(false);
    }
  }, [logout, router]);

  return {
    user,
    loading, // Pass loading state to the component
    isGuest,
    activeTab,
    popupType,
    popupBookingId,
    initialProfileSection,
    selectedCategory,
    setSelectedCategory,
    selectedRadius,
    setSelectedRadius,
    bookingFilter,
    setBookingFilter,
    isLoggingOut,
    searchQuery,
    setSearchQuery,
    showFilters,
    setShowFilters,
    onlineOnly,
    setOnlineOnly,
    femaleOnly,
    setFemaleOnly,
    rating45Plus,
    setRating45Plus,
    verifiedOnly,
    setVerifiedOnly,
    sortBy,
    setSortBy,
    isActionPopupOpen,
    closeActionPopup,
    isMapPickerOpen,
    setIsMapPickerOpen,
    handleLogout,
  };
}

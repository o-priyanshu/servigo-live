"use client";

import { Suspense } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import  CustomerLayout  from "@/components/customer/shared/CustomerLayout";
import { useDashboard }  from "@/components/customer/dashboard/useDashboard";
import { useLocation } from "@/components/customer/location/useLocation";
import { useProviders } from "@/components/customer/providers/useProviders";
import { useBookings } from "@/components/customer/booking/useBookings";
import  DashboardActionPopup  from "@/components/customer/dashboard/DashboardActionPopup";
import DashboardHome from "@/components/customer/dashboard/DashboardHome";
import DashboardBookings from "@/components/customer/dashboard/DashboardBookings";
import DashboardProfile from "@/components/customer/dashboard/DashboardProfile";
import { buildAuthHref } from "@/lib/auth/callback-url";
import { useCustomerStore } from "@/store/customerStore";

function formatAreaLabel(value: string) {
  const trimmed = value.trim();
  if (trimmed === "Permission Denied" || trimmed === "Location Unavailable") return "Choose Area";
  return trimmed || "Choose Area";
}

function DashboardInner() {
  const router = useRouter();
  const fetchNotifications = useCustomerStore((state) => state.fetchNotifications);
  const fetchFavorites = useCustomerStore((state) => state.fetchFavorites);
  const subscribeToNotifications = useCustomerStore(
    (state) => state.subscribeToNotifications
  );
  const unreadNotifications = useCustomerStore((state) =>
    state.notifications.filter((item) => item.read !== true).length
  );

  const {
    user, isGuest, activeTab, popupType, popupBookingId, initialProfileSection,
    selectedCategory, setSelectedCategory,
    selectedRadius, setSelectedRadius,
    bookingFilter, setBookingFilter,
    isLoggingOut, searchQuery, setSearchQuery,
    showFilters, setShowFilters,
    onlineOnly, setOnlineOnly,
    femaleOnly, setFemaleOnly,
    rating45Plus, setRating45Plus,
    verifiedOnly, setVerifiedOnly,
    sortBy, setSortBy,
    isActionPopupOpen, closeActionPopup,
    isMapPickerOpen, setIsMapPickerOpen,
    handleLogout,
  } = useDashboard();

  const {
    hasLocationAccess, locationLabel, userCoords,
    isValidatingLocation,
    locationValidationError,
    isSelectedPincodeServiceable,
    handleSelectLocation, applyLocationSelection, resolveLocationLabel,
  } = useLocation();

  const { providers, loading: providersLoading, error: providersError } = useProviders({
    selectedCategory, selectedRadius, userCoords,
    searchQuery, onlineOnly, femaleOnly, rating45Plus, verifiedOnly, sortBy,
  });

  const {
    bookings,
    loading: bookingsLoading, error: bookingsError,
    filteredBookings,
  } = useBookings(user?.uid, bookingFilter);
  const recentBookings = [...bookings]
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
    .slice(0, 3);

  const areaLabel = formatAreaLabel(locationLabel);

  useEffect(() => {
    if (isGuest || !user?.uid) return;
    void fetchFavorites();
    void fetchNotifications();
    const unsubscribe = subscribeToNotifications();
    return unsubscribe;
  }, [fetchFavorites, fetchNotifications, isGuest, subscribeToNotifications, user?.uid]);

  const navbarContent = (
    <div className="flex items-center justify-end gap-2">
      <div className="hidden h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-border/80 bg-card px-3 md:flex">
        <Search size={15} className="text-muted-foreground" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={`Search providers in ${areaLabel}`}
          className="w-full bg-transparent text-sm text-foreground outline-none"
        />
      </div>
      <Button
        variant="outline"
        className="h-10 rounded-xl px-3"
        onClick={() => setIsMapPickerOpen(true)}
      >
        <MapPin size={14} className="mr-1.5 text-muted-foreground" />
        <span className="max-w-32 truncate">{areaLabel}</span>
      </Button>
      {isGuest ? (
        <Button
          className="h-10 rounded-xl px-4 bg-foreground text-background hover:bg-foreground/90"
          onClick={() =>
            router.push(
              buildAuthHref("/auth/login", { callbackUrl: "/dashboard?tab=home" })
            )
          }
        >
          Login
        </Button>
      ) : (
        <Button
          variant="outline"
          className="relative h-10 w-10 rounded-xl p-0"
          onClick={() => router.push("/dashboard?tab=profile&section=notifications")}
          aria-label="Open notifications"
        >
          <Bell size={18} />
          {unreadNotifications > 0 ? (
            <span className="absolute -right-1 -top-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
              {unreadNotifications > 99 ? "99+" : unreadNotifications}
            </span>
          ) : null}
        </Button>
      )}
    </div>
  );

  return (
    <CustomerLayout navbarContent={navbarContent}>
      <DashboardActionPopup
        isOpen={isActionPopupOpen}
        popupType={popupType}
        popupBookingId={popupBookingId}
        onClose={closeActionPopup}
      />

      {!isGuest && activeTab === "bookings" ? (
        <DashboardBookings
          loading={bookingsLoading}
          error={bookingsError}
          bookingFilter={bookingFilter}
          setBookingFilter={setBookingFilter}
          filteredBookings={filteredBookings}
        />
      ) : !isGuest && activeTab === "profile" ? (
        <DashboardProfile
          user={user!}
          handleLogout={handleLogout}
          isLoggingOut={isLoggingOut}
          initialSection={initialProfileSection}
        />
      ) : (
        <DashboardHome
          providers={providers}
          providersLoading={providersLoading}
          providersError={providersError}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          selectedRadius={selectedRadius}
          setSelectedRadius={setSelectedRadius}
          sortBy={sortBy}
          setSortBy={setSortBy}
          showFilters={showFilters}
          setShowFilters={setShowFilters}
          onlineOnly={onlineOnly}
          setOnlineOnly={setOnlineOnly}
          femaleOnly={femaleOnly}
          setFemaleOnly={setFemaleOnly}
              rating45Plus={rating45Plus}
              setRating45Plus={setRating45Plus}
              verifiedOnly={verifiedOnly}
              setVerifiedOnly={setVerifiedOnly}
              hasLocationAccess={hasLocationAccess}
          locationLabel={locationLabel}
          userCoords={userCoords}
          isValidatingLocation={isValidatingLocation}
          locationValidationError={locationValidationError}
              isSelectedPincodeServiceable={isSelectedPincodeServiceable}
              handleSelectLocation={handleSelectLocation}
              applyLocationSelection={applyLocationSelection}
              resolveLocationLabel={resolveLocationLabel}
              isMapPickerOpen={isMapPickerOpen}
              setIsMapPickerOpen={setIsMapPickerOpen}
          recentBookings={recentBookings}
        />
      )}
    </CustomerLayout>
  );
}

export default function Dashboard() {
  return (
    <Suspense>
      <DashboardInner />
    </Suspense>
  );
}

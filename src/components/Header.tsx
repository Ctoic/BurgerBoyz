import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, MapPin, Navigation, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ApiError, apiFetch } from "@/lib/api";
import type {
  ApiDeliveryZone,
  ApiDeliveryZoneCheckResponse,
  ApiLocationReverseResponse,
} from "@/lib/types";

const LOCATION_STORAGE_KEY = "burgerboyz_selected_location";

interface StoredLocationPreference {
  id?: string;
  source?: "ZONE" | "GPS";
  name: string;
  line1?: string | null;
  city?: string | null;
  postcode?: string | null;
  postcodePrefix?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

const DEFAULT_MAP_LAT = 53.4808;
const DEFAULT_MAP_LON = -2.2426;
const DEMO_OTP_CODE = "123456";
const DEMO_OTP_EXPIRY_SECONDS = 300;
type AuthModalView = "welcome" | "login" | "signup";

interface SignupAddressState {
  houseNo: string;
  apartment: string;
  street: string;
  city: string;
  postcode: string;
  instructions: string;
  latitude: number | null;
  longitude: number | null;
  locationLabel: string;
}

const getGeolocationFailureMessage = (error?: GeolocationPositionError | null) => {
  if (!error) {
    return "Could not fetch your current location.";
  }

  switch (error.code) {
    case error.PERMISSION_DENIED:
      return "Location permission denied. Allow location access in your browser settings and try again.";
    case error.POSITION_UNAVAILABLE:
      return "Your location is currently unavailable. Check GPS/network and try again.";
    case error.TIMEOUT:
      return "Location request timed out. Try again in an open area or with better network.";
    default:
      return error.message || "Could not fetch your current location.";
  }
};

const readStoredLocationPreference = (): StoredLocationPreference | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LOCATION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredLocationPreference;
    if (!parsed || typeof parsed !== "object" || !parsed.name) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [authModalView, setAuthModalView] = useState<AuthModalView>("welcome");
  const [loginEmail, setLoginEmail] = useState("");
  const [signupState, setSignupState] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [signupOtpCode, setSignupOtpCode] = useState("");
  const [isSignupOtpRequested, setIsSignupOtpRequested] = useState(false);
  const [isDemoOtpMode, setIsDemoOtpMode] = useState(false);
  const [signupOtpResendIn, setSignupOtpResendIn] = useState(0);
  const [signupOtpExpiresIn, setSignupOtpExpiresIn] = useState(0);
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isAddressSubmitting, setIsAddressSubmitting] = useState(false);
  const [isAddressLocating, setIsAddressLocating] = useState(false);
  const [isAddressResolvingLocation, setIsAddressResolvingLocation] = useState(false);
  const [addressFormError, setAddressFormError] = useState<string | null>(null);
  const [signupAddressState, setSignupAddressState] = useState<SignupAddressState>({
    houseNo: "",
    apartment: "",
    street: "",
    city: "",
    postcode: "",
    instructions: "",
    latitude: null,
    longitude: null,
    locationLabel: "",
  });
  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<StoredLocationPreference | null>(
    () => readStoredLocationPreference(),
  );
  const [pickerZoneId, setPickerZoneId] = useState<string>(
    () => readStoredLocationPreference()?.id ?? "",
  );
  const [pickerDraft, setPickerDraft] = useState<StoredLocationPreference | null>(
    () => readStoredLocationPreference(),
  );
  const [locationPickerError, setLocationPickerError] = useState<string | null>(null);
  const [deliveryHint, setDeliveryHint] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isResolvingLocation, setIsResolvingLocation] = useState(false);
  const location = useLocation();
  const { user, login, signup, requestSignupOtp, verifySignupOtp, logout } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoginOpen || signupOtpResendIn <= 0) return;
    const timer = window.setInterval(() => {
      setSignupOtpResendIn((value) => (value > 0 ? value - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isLoginOpen, signupOtpResendIn]);

  useEffect(() => {
    if (!isLoginOpen || signupOtpExpiresIn <= 0) return;
    const timer = window.setInterval(() => {
      setSignupOtpExpiresIn((value) => (value > 0 ? value - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isLoginOpen, signupOtpExpiresIn]);

  const publicZonesQuery = useQuery({
    queryKey: ["public-delivery-zones"],
    queryFn: () => apiFetch<ApiDeliveryZone[]>("/delivery-zones"),
    refetchInterval: 30000,
  });

  const logoutMutation = useMutation({
    mutationFn: () => logout(),
    onSuccess: () => {
      setIsOpen(false);
      toast({
        title: "Logged out",
        description: "You have been signed out.",
      });
    },
    onError: (error) => {
      toast({
        title: "Logout failed",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    },
  });

  const navLinks = [
    { name: "Home", path: "/" },
    { name: "Menu", path: "/menu" },
    { name: "Deals", path: "/deals" },
    { name: "About", path: "/about" },
    { name: "Contact", path: "/contact" },
  ];

  const isActive = (path: string) => location.pathname === path;
  const customerDisplayName = user?.name?.trim() || user?.email?.split("@")[0] || "Customer";
  const customerInitials = customerDisplayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  const locationOptions = publicZonesQuery.data ?? [];
  const mapLatitude = pickerDraft?.latitude ?? DEFAULT_MAP_LAT;
  const mapLongitude = pickerDraft?.longitude ?? DEFAULT_MAP_LON;
  const mapBboxDelta = 0.01;
  const locationMapEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${mapLongitude - mapBboxDelta}%2C${mapLatitude - mapBboxDelta}%2C${mapLongitude + mapBboxDelta}%2C${mapLatitude + mapBboxDelta}&layer=mapnik&marker=${mapLatitude}%2C${mapLongitude}`;
  const locationMapViewUrl = `https://www.openstreetmap.org/?mlat=${mapLatitude}&mlon=${mapLongitude}#map=15/${mapLatitude}/${mapLongitude}`;
  const signupMapLatitude =
    signupAddressState.latitude ?? selectedLocation?.latitude ?? DEFAULT_MAP_LAT;
  const signupMapLongitude =
    signupAddressState.longitude ?? selectedLocation?.longitude ?? DEFAULT_MAP_LON;
  const signupMapEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${signupMapLongitude - mapBboxDelta}%2C${signupMapLatitude - mapBboxDelta}%2C${signupMapLongitude + mapBboxDelta}%2C${signupMapLatitude + mapBboxDelta}&layer=mapnik&marker=${signupMapLatitude}%2C${signupMapLongitude}`;
  const signupMapViewUrl = `https://www.openstreetmap.org/?mlat=${signupMapLatitude}&mlon=${signupMapLongitude}#map=15/${signupMapLatitude}/${signupMapLongitude}`;

  const persistSelectedLocation = (value: StoredLocationPreference | null) => {
    setSelectedLocation(value);
    if (typeof window === "undefined") return;
    if (!value) {
      window.localStorage.removeItem(LOCATION_STORAGE_KEY);
      window.dispatchEvent(new Event("burgerboyz-location-change"));
      return;
    }
    window.localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(value));
    window.dispatchEvent(new Event("burgerboyz-location-change"));
  };

  const checkLocationAvailability = async (payload: {
    city?: string | null;
    postcode?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  }) => {
    try {
      const result = await apiFetch<ApiDeliveryZoneCheckResponse>("/delivery-zones/check", {
        method: "POST",
        body: JSON.stringify({
          city: payload.city ?? undefined,
          postcode: payload.postcode ?? undefined,
          latitude: payload.latitude ?? undefined,
          longitude: payload.longitude ?? undefined,
        }),
      });
      setDeliveryHint(result.reason);
    } catch {
      setDeliveryHint(null);
    }
  };

  const resolveCurrentLocationInPicker = () => {
    if (!navigator.geolocation) {
      setLocationPickerError("Location is not supported in this browser.");
      return;
    }
    if (!window.isSecureContext) {
      setLocationPickerError(
        "Location access needs a secure context (HTTPS or localhost).",
      );
      return;
    }

    setLocationPickerError(null);
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = Number(position.coords.latitude.toFixed(6));
        const longitude = Number(position.coords.longitude.toFixed(6));
        setIsResolvingLocation(true);
        try {
          const reverse = await apiFetch<ApiLocationReverseResponse>(
            `/location/reverse?lat=${latitude}&lon=${longitude}`,
          );
          const draft: StoredLocationPreference = {
            source: "GPS",
            name: reverse.displayName ?? "Current location",
            line1: reverse.line1,
            city: reverse.city,
            postcode: reverse.postcode,
            latitude: reverse.latitude,
            longitude: reverse.longitude,
          };
          setPickerDraft(draft);
          setPickerZoneId("");
          await checkLocationAvailability({
            city: draft.city,
            postcode: draft.postcode,
            latitude: draft.latitude,
            longitude: draft.longitude,
          });
        } catch {
          const draft: StoredLocationPreference = {
            source: "GPS",
            name: "Current location",
            latitude,
            longitude,
          };
          setPickerDraft(draft);
          setPickerZoneId("");
          setLocationPickerError(
            "Current location found, but address details are unavailable right now.",
          );
        } finally {
          setIsResolvingLocation(false);
          setIsLocating(false);
        }
      },
      (error) => {
        setLocationPickerError(getGeolocationFailureMessage(error));
        setIsLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  };

  const saveZoneFromPicker = async (zoneId: string) => {
    setPickerZoneId(zoneId);
    const zone = locationOptions.find((item) => item.id === zoneId);
    if (!zone) {
      setPickerDraft(null);
      setDeliveryHint(null);
      return;
    }

    const draft: StoredLocationPreference = {
      id: zone.id,
      source: "ZONE",
      name: zone.name,
      city: zone.city,
      postcodePrefix: zone.postcodePrefixes[0] ?? null,
      postcode: zone.postcodePrefixes[0] ?? null,
      latitude: zone.centerLatitude ?? null,
      longitude: zone.centerLongitude ?? null,
    };
    setPickerDraft(draft);
    await checkLocationAvailability({
      city: draft.city,
      postcode: draft.postcode ?? draft.postcodePrefix,
      latitude: draft.latitude,
      longitude: draft.longitude,
    });
  };

  const resetSignupAddressState = () => {
    setSignupAddressState({
      houseNo: "",
      apartment: "",
      street: "",
      city: "",
      postcode: "",
      instructions: "",
      latitude: null,
      longitude: null,
      locationLabel: "",
    });
    setAddressFormError(null);
    setIsAddressLocating(false);
    setIsAddressResolvingLocation(false);
    setIsAddressSubmitting(false);
  };

  const openAddressModalAfterOtp = () => {
    setSignupAddressState({
      houseNo: "",
      apartment: "",
      street: selectedLocation?.line1 ?? "",
      city: selectedLocation?.city ?? "",
      postcode: selectedLocation?.postcode ?? selectedLocation?.postcodePrefix ?? "",
      instructions: "",
      latitude: selectedLocation?.latitude ?? null,
      longitude: selectedLocation?.longitude ?? null,
      locationLabel: selectedLocation?.name ?? "",
    });
    setAddressFormError(null);
    setIsAddressModalOpen(true);
  };

  const applyDetectedAddressToSignupForm = (payload: {
    label: string;
    line1?: string | null;
    city?: string | null;
    postcode?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  }) => {
    const normalizedStreet = (payload.line1 ?? "")
      .replace(/^\s*\d+[A-Za-z-]*\s+/, "")
      .trim();
    setSignupAddressState((prev) => ({
      ...prev,
      street: normalizedStreet || prev.street,
      city: payload.city ?? prev.city,
      postcode: payload.postcode ?? prev.postcode,
      latitude: payload.latitude ?? prev.latitude,
      longitude: payload.longitude ?? prev.longitude,
      locationLabel: payload.label,
    }));
  };

  const useSavedLocationForSignupAddress = () => {
    if (!selectedLocation) {
      setAddressFormError("No saved location found. Use current location first.");
      return;
    }
    applyDetectedAddressToSignupForm({
      label: selectedLocation.name,
      line1: selectedLocation.line1,
      city: selectedLocation.city,
      postcode: selectedLocation.postcode ?? selectedLocation.postcodePrefix,
      latitude: selectedLocation.latitude,
      longitude: selectedLocation.longitude,
    });
    setAddressFormError(null);
  };

  const resolveCurrentLocationForSignupAddress = () => {
    if (!navigator.geolocation) {
      setAddressFormError("Location is not supported in this browser.");
      return;
    }
    if (!window.isSecureContext) {
      setAddressFormError(
        "Location access needs a secure context (HTTPS or localhost).",
      );
      return;
    }
    setAddressFormError(null);
    setIsAddressLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = Number(position.coords.latitude.toFixed(6));
        const longitude = Number(position.coords.longitude.toFixed(6));
        setIsAddressResolvingLocation(true);
        try {
          const reverse = await apiFetch<ApiLocationReverseResponse>(
            `/location/reverse?lat=${latitude}&lon=${longitude}`,
          );
          applyDetectedAddressToSignupForm({
            label: reverse.displayName ?? "Current location",
            line1: reverse.line1,
            city: reverse.city,
            postcode: reverse.postcode,
            latitude: reverse.latitude,
            longitude: reverse.longitude,
          });
          setAddressFormError(null);
        } catch {
          setSignupAddressState((prev) => ({
            ...prev,
            latitude,
            longitude,
            locationLabel: "Current location",
          }));
          setAddressFormError(
            "Current location found, but address details are unavailable right now.",
          );
        } finally {
          setIsAddressResolvingLocation(false);
          setIsAddressLocating(false);
        }
      },
      (error) => {
        setAddressFormError(getGeolocationFailureMessage(error));
        setIsAddressLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  };

  const resetSignupOtpState = () => {
    setSignupOtpCode("");
    setIsSignupOtpRequested(false);
    setIsDemoOtpMode(false);
    setSignupOtpResendIn(0);
    setSignupOtpExpiresIn(0);
  };

  const resetAuthModal = () => {
    setAuthModalView("welcome");
    setLoginEmail("");
    setSignupState({ name: "", email: "", phone: "" });
    resetSignupOtpState();
    resetSignupAddressState();
    setIsAuthSubmitting(false);
  };

  const openAuthModal = (view: AuthModalView = "welcome") => {
    setAuthModalView(view);
    setIsLoginOpen(true);
  };

  const handleCustomerLogin = async () => {
    const email = loginEmail.trim();
    if (!email) {
      toast({
        title: "Email required",
        description: "Enter your email to continue.",
      });
      return;
    }

    setIsAuthSubmitting(true);
    try {
      await login(email);
      toast({
        title: "Logged in",
        description: "Welcome back.",
      });
      setIsLoginOpen(false);
      resetAuthModal();
    } catch (error) {
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const handleCustomerSignup = async () => {
    const email = signupState.email.trim();
    if (!email) {
      toast({
        title: "Email required",
        description: "Enter your email to continue.",
      });
      return;
    }

    setIsAuthSubmitting(true);
    try {
      const response = await requestSignupOtp(email);
      setIsSignupOtpRequested(true);
      setIsDemoOtpMode(false);
      setSignupOtpResendIn(response.resendAfterSeconds);
      setSignupOtpExpiresIn(response.expiresInSeconds);
      setSignupOtpCode("");
      toast({
        title: "OTP sent",
        description: "Check your email for the 6-digit verification code.",
      });
    } catch (error) {
      const isOtpServiceUnavailable =
        (error instanceof ApiError && error.status === 503) ||
        (error instanceof Error && /otp email service is not configured/i.test(error.message));

      if (isOtpServiceUnavailable) {
        setIsSignupOtpRequested(true);
        setIsDemoOtpMode(true);
        setSignupOtpResendIn(0);
        setSignupOtpExpiresIn(DEMO_OTP_EXPIRY_SECONDS);
        setSignupOtpCode(DEMO_OTP_CODE);
        toast({
          title: "Demo OTP ready",
          description:
            "Email service is not connected yet. OTP has been auto-filled for demo preview.",
        });
        return;
      }

      toast({
        variant: "destructive",
        className: "w-[88vw] max-w-[320px] p-3 pr-7 sm:w-full sm:max-w-[360px] sm:p-4 sm:pr-8",
        title: <span className="text-xs font-semibold sm:text-sm">Unable to send OTP</span>,
        description: (
          <span className="text-[11px] leading-4 sm:text-xs">
            {error instanceof Error ? error.message : "Please try again."}
          </span>
        ),
      });
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const handleVerifySignupOtp = async () => {
    const email = signupState.email.trim();
    if (!email) {
      toast({
        title: "Email required",
        description: "Enter your email to continue.",
      });
      return;
    }

    if (isDemoOtpMode) {
      if (signupOtpCode !== DEMO_OTP_CODE) {
        toast({
          title: "Enter valid OTP",
          description: "Use the auto-filled demo OTP code to continue.",
        });
        return;
      }

      setIsAuthSubmitting(true);
      try {
        setIsLoginOpen(false);
        openAddressModalAfterOtp();
        toast({
          title: "OTP verified",
          description: "Now add your address to complete signup.",
        });
      } finally {
        setIsAuthSubmitting(false);
      }
      return;
    }

    if (!/^\d{6}$/.test(signupOtpCode)) {
      toast({
        title: "Enter valid OTP",
        description: "Use the 6-digit code sent to your email.",
      });
      return;
    }

    setIsAuthSubmitting(true);
    try {
      await verifySignupOtp({
        email,
        code: signupOtpCode,
        name: signupState.name.trim() || undefined,
        phone: signupState.phone.trim() || undefined,
      });
      toast({
        title: "OTP verified",
        description: "Now add your address to complete signup.",
      });
      setIsLoginOpen(false);
      openAddressModalAfterOtp();
    } catch (error) {
      toast({
        title: "OTP verification failed",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const handleCompleteSignupWithAddress = async () => {
    const email = signupState.email.trim();
    const houseNo = signupAddressState.houseNo.trim();
    const street = signupAddressState.street.trim();
    const city = signupAddressState.city.trim();
    const postcode = signupAddressState.postcode.trim();

    if (!email) {
      toast({
        variant: "destructive",
        title: "Email required",
        description: "Please restart signup and enter your email.",
      });
      return;
    }

    if (!houseNo || !street || !city || !postcode) {
      setAddressFormError("House number, street, city, and postcode are required.");
      return;
    }

    const line1 = street.toLowerCase().startsWith(houseNo.toLowerCase())
      ? street
      : `${houseNo} ${street}`;

    setAddressFormError(null);
    setIsAddressSubmitting(true);
    try {
      await signup({
        email,
        name: signupState.name.trim(),
        phone: signupState.phone.trim(),
        addressLine1: line1.trim(),
        addressLine2: signupAddressState.apartment.trim() || undefined,
        addressCity: city,
        addressPostcode: postcode,
        addressInstructions: signupAddressState.instructions.trim() || undefined,
      });
      setIsAddressModalOpen(false);
      toast({
        title: "Signup complete",
        description: "Account created with your address details.",
      });
      resetAuthModal();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Signup failed",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsAddressSubmitting(false);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border shadow-sm">
      <div className="container-custom section-padding">
        <div className="flex min-h-16 items-center justify-between py-2 md:min-h-20 md:py-3">
          {/* Logo */}
          <div className="flex min-w-0 flex-col items-start gap-1">
            <Link to="/" className="flex items-center gap-1">
              <span className="font-display text-2xl md:text-3xl text-brand-black">BURGER</span>
              <span className="font-display text-2xl md:text-3xl text-primary">BOYS</span>
            </Link>
            <div className="w-[170px] sm:w-[220px]">
              <button
                type="button"
                onClick={() => {
                  setIsLocationPickerOpen(true);
                  setPickerDraft(selectedLocation);
                  setPickerZoneId(selectedLocation?.id ?? "");
                  setDeliveryHint(null);
                  setLocationPickerError(null);
                  if (!selectedLocation?.latitude || !selectedLocation?.longitude) {
                    resolveCurrentLocationInPicker();
                  }
                }}
                className="flex h-8 w-full items-center justify-between rounded-md border border-border bg-background px-2 text-[11px] font-medium text-foreground transition-colors hover:border-primary sm:h-9 sm:text-xs"
                aria-label="Open location picker"
              >
                <span className="truncate">{selectedLocation?.name ?? "Select location"}</span>
                <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
              </button>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`font-semibold transition-colors duration-300 ${
                  isActive(link.path)
                    ? "text-primary"
                    : "text-foreground hover:text-primary"
                }`}
              >
                {link.name}
              </Link>
            ))}
          </nav>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <>
                <Link to="/account">
                  <div className="flex items-center gap-3 rounded-full border border-border bg-background px-2 py-1.5 pr-3 transition-colors hover:border-primary/50">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                      {customerInitials || "C"}
                    </span>
                    <div className="hidden lg:block leading-tight">
                      <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                        Burger Guys
                      </p>
                      <p className="max-w-[140px] truncate text-sm font-semibold text-foreground">
                        {customerDisplayName}
                      </p>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
                <Button
                  variant="outline"
                  className="rounded-md px-4"
                  onClick={() => logoutMutation.mutate()}
                  disabled={logoutMutation.isPending}
                >
                  {logoutMutation.isPending ? "Logging out..." : "Logout"}
                </Button>
              </>
            ) : (
              <Button className="btn-order" onClick={() => openAuthModal("welcome")}>
                Login
              </Button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden text-foreground p-2"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <nav className="md:hidden py-4 animate-slide-up">
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsOpen(false)}
                  className={`font-semibold py-2 transition-colors ${
                    isActive(link.path)
                      ? "text-primary"
                      : "text-foreground hover:text-primary"
                  }`}
                >
                  {link.name}
                </Link>
              ))}
              {user ? (
                <>
                  <Link to="/account" onClick={() => setIsOpen(false)}>
                    <div className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                          {customerInitials || "C"}
                        </span>
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                            Burger Guys
                          </p>
                          <p className="truncate text-sm font-semibold text-foreground">
                            {customerDisplayName}
                          </p>
                        </div>
                      </div>
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </div>
                  </Link>
                  <Button
                    variant="outline"
                    className="w-full rounded-md"
                    onClick={() => logoutMutation.mutate()}
                    disabled={logoutMutation.isPending}
                  >
                    {logoutMutation.isPending ? "Logging out..." : "Logout"}
                  </Button>
                </>
              ) : (
                <Button
                  className="btn-order w-full"
                  onClick={() => {
                    setIsOpen(false);
                    openAuthModal("welcome");
                  }}
                >
                  Login
                </Button>
              )}
            </div>
          </nav>
        )}
      </div>

      <Dialog open={isLocationPickerOpen} onOpenChange={setIsLocationPickerOpen}>
        <DialogContent className="w-[94vw] max-w-2xl rounded-[18px] border border-border bg-card p-5 shadow-[var(--shadow-card)] sm:p-6">
          <div className="space-y-4">
            <div>
              <h2 className="font-display text-2xl text-foreground">Choose your location</h2>
              <p className="text-sm text-muted-foreground">
                Pick a delivery zone manually or detect your current location on map.
              </p>
            </div>

            <div className="overflow-hidden rounded-xl border border-border bg-background">
              <iframe
                title="Location picker map"
                src={locationMapEmbedUrl}
                className="h-56 w-full"
                loading="lazy"
              />
              <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
                <span>OpenStreetMap preview</span>
                <a
                  href={locationMapViewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-primary hover:underline"
                >
                  Open full map
                </a>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <select
                value={pickerZoneId}
                onChange={(event) => {
                  void saveZoneFromPicker(event.target.value);
                }}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Choose a zone manually</option>
                {locationOptions.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.name}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-full px-5"
                onClick={resolveCurrentLocationInPicker}
                disabled={isLocating || isResolvingLocation}
              >
                <Navigation className="h-4 w-4" />
                {isLocating
                  ? "Locating..."
                  : isResolvingLocation
                    ? "Resolving..."
                    : "Use current location"}
              </Button>
            </div>

            {pickerDraft && (
              <div className="rounded-xl border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
                <p className="font-semibold text-foreground">{pickerDraft.name}</p>
                {pickerDraft.line1 ? <p>{pickerDraft.line1}</p> : null}
                {(pickerDraft.city || pickerDraft.postcode || pickerDraft.postcodePrefix) ? (
                  <p>
                    {[pickerDraft.city, pickerDraft.postcode ?? pickerDraft.postcodePrefix]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                ) : null}
              </div>
            )}

            {deliveryHint ? (
              <p className="text-xs font-semibold text-foreground">{deliveryHint}</p>
            ) : null}
            {locationPickerError ? (
              <p className="text-xs font-semibold text-destructive">{locationPickerError}</p>
            ) : null}

            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                onClick={() => {
                  persistSelectedLocation(null);
                  setPickerDraft(null);
                  setPickerZoneId("");
                  setIsLocationPickerOpen(false);
                }}
              >
                Clear
              </Button>
              <Button
                type="button"
                className="btn-order rounded-full"
                onClick={() => {
                  if (!pickerDraft) {
                    toast({
                      title: "Select a location",
                      description: "Choose a zone or use current location first.",
                    });
                    return;
                  }
                  persistSelectedLocation(pickerDraft);
                  setIsLocationPickerOpen(false);
                  toast({
                    title: "Location updated",
                    description: pickerDraft.name,
                  });
                }}
              >
                Save Location
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isLoginOpen}
        onOpenChange={(open) => {
          setIsLoginOpen(open);
          if (!open) {
            resetAuthModal();
          }
        }}
      >
        <DialogContent className="w-[92vw] max-w-[620px] rounded-3xl border border-border bg-card p-0 shadow-[var(--shadow-card)]">
          {authModalView === "welcome" ? (
            <div className="rounded-3xl bg-card px-6 py-7 sm:px-8 sm:py-8">
              <div className="space-y-1">
                <h2 className="font-display text-5xl text-foreground">Welcome!</h2>
                <p className="text-lg text-muted-foreground sm:text-xl">
                  Sign up or log in to continue
                </p>
              </div>

              <button
                type="button"
                className="mt-8 flex h-14 w-full items-center justify-center gap-4 rounded-full border border-border bg-background text-lg font-semibold text-foreground transition-colors hover:border-primary/50"
                onClick={() =>
                  toast({
                    title: "Google login coming soon",
                    description: "For now, use Login or Signup below.",
                  })
                }
              >
                <span className="text-3xl font-bold leading-none text-primary">G</span>
                Continue with Google
              </button>

              <div className="my-7 flex items-center gap-3 text-muted-foreground">
                <div className="h-px flex-1 bg-border" />
                <span className="text-lg">or</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <div className="space-y-4">
                <Button
                  className="h-14 w-full rounded-full bg-brand-orange text-lg font-semibold text-brand-white hover:bg-brand-orange/90"
                  onClick={() => setAuthModalView("login")}
                >
                  Login
                </Button>

                <Button
                  variant="outline"
                  className="h-14 w-full rounded-full border-2 border-brand-black/70 text-lg font-semibold text-foreground hover:bg-muted/30"
                  onClick={() => {
                    resetSignupOtpState();
                    setAuthModalView("signup");
                  }}
                >
                  Signup
                </Button>
              </div>

              <p className="mt-8 text-sm leading-relaxed text-muted-foreground sm:text-base">
                By signing up, you agree to our{" "}
                <span className="font-semibold text-foreground">Terms and Conditions</span> and{" "}
                <span className="font-semibold text-foreground">Privacy Policy.</span>
              </p>
            </div>
          ) : null}

          {authModalView === "login" ? (
            <div className="rounded-3xl bg-card px-6 py-7 sm:px-8 sm:py-8">
              <div className="space-y-1">
                <h2 className="font-display text-4xl text-foreground">Login</h2>
                <p className="text-sm text-muted-foreground">
                  Enter your email to sign in instantly.
                </p>
              </div>

              <div className="mt-6 space-y-4">
                <Input
                  type="email"
                  placeholder="Email address"
                  value={loginEmail}
                  onChange={(event) => setLoginEmail(event.target.value)}
                />
                <Button
                  className="h-12 w-full rounded-full bg-brand-orange text-base font-semibold text-brand-white hover:bg-brand-orange/90"
                  onClick={() => void handleCustomerLogin()}
                  disabled={isAuthSubmitting}
                >
                  {isAuthSubmitting ? "Signing in..." : "Continue"}
                </Button>
              </div>

              <div className="mt-5 flex items-center justify-between text-sm">
                <button
                  type="button"
                  className="font-semibold text-foreground/70 hover:text-foreground"
                  onClick={() => {
                    resetSignupOtpState();
                    setAuthModalView("welcome");
                  }}
                >
                  Back
                </button>
                <button
                  type="button"
                  className="font-semibold text-brand-orange hover:opacity-80"
                  onClick={() => {
                    resetSignupOtpState();
                    setAuthModalView("signup");
                  }}
                >
                  Need an account? Signup
                </button>
              </div>
            </div>
          ) : null}

          {authModalView === "signup" ? (
            <div className="rounded-3xl bg-card px-6 py-7 sm:px-8 sm:py-8">
              <div className="space-y-1">
                <h2 className="font-display text-4xl text-foreground">Signup</h2>
                <p className="text-sm text-muted-foreground">
                  Create your account with email and verify with OTP.
                </p>
              </div>

              <div className="mt-6 space-y-3">
                <Input
                  placeholder="Full name (optional)"
                  value={signupState.name}
                  onChange={(event) =>
                    setSignupState((prev) => ({ ...prev, name: event.target.value }))
                  }
                />
                <Input
                  type="email"
                  placeholder="Email address"
                  value={signupState.email}
                  onChange={(event) =>
                    setSignupState((prev) => ({ ...prev, email: event.target.value }))
                  }
                />
                <Input
                  placeholder="Phone number (optional)"
                  value={signupState.phone}
                  onChange={(event) =>
                    setSignupState((prev) => ({ ...prev, phone: event.target.value }))
                  }
                />

                {!isSignupOtpRequested ? (
                  <Button
                    className="h-12 w-full rounded-full bg-brand-orange text-base font-semibold text-brand-white hover:bg-brand-orange/90"
                    onClick={() => void handleCustomerSignup()}
                    disabled={isAuthSubmitting}
                  >
                    {isAuthSubmitting ? "Sending OTP..." : "Send OTP"}
                  </Button>
                ) : (
                  <div className="rounded-xl border border-border bg-background p-4">
                    <p className="mb-3 text-sm text-muted-foreground">
                      {isDemoOtpMode ? (
                        <>
                          Demo mode is active. OTP is auto-filled for{" "}
                          <span className="font-semibold text-foreground">{signupState.email.trim()}</span>
                          .
                        </>
                      ) : (
                        <>
                          Enter the 6-digit code sent to{" "}
                          <span className="font-semibold text-foreground">{signupState.email.trim()}</span>
                        </>
                      )}
                    </p>
                    <div className="mb-3 flex justify-center">
                      <InputOTP
                        value={signupOtpCode}
                        onChange={(value) => setSignupOtpCode(value.replace(/\D/g, "").slice(0, 6))}
                        maxLength={6}
                        containerClassName="justify-center gap-1"
                      >
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                          <InputOTPSlot index={3} />
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button
                        className="h-11 flex-1 rounded-full bg-brand-orange text-sm font-semibold text-brand-white hover:bg-brand-orange/90"
                        onClick={() => void handleVerifySignupOtp()}
                        disabled={isAuthSubmitting || signupOtpCode.length !== 6}
                      >
                        {isAuthSubmitting ? "Verifying..." : "Verify and create account"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11 rounded-full px-4 text-sm"
                        onClick={() => void handleCustomerSignup()}
                        disabled={isAuthSubmitting || signupOtpResendIn > 0}
                      >
                        {signupOtpResendIn > 0 ? `Resend in ${signupOtpResendIn}s` : "Resend OTP"}
                      </Button>
                    </div>

                    <p className="mt-2 text-xs text-muted-foreground">
                      {isDemoOtpMode
                        ? "Demo OTP is for UI preview only."
                        : `Code expires in ${signupOtpExpiresIn}s.`}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-5 flex items-center justify-between text-sm">
                <button
                  type="button"
                  className="font-semibold text-foreground/70 hover:text-foreground"
                  onClick={() => {
                    resetSignupOtpState();
                    setAuthModalView("welcome");
                  }}
                >
                  Back
                </button>
                <button
                  type="button"
                  className="font-semibold text-brand-orange hover:opacity-80"
                  onClick={() => {
                    resetSignupOtpState();
                    setAuthModalView("login");
                  }}
                >
                  Already have account? Login
                </button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={isAddressModalOpen}
        onOpenChange={(open) => {
          if (!isAddressSubmitting) {
            setIsAddressModalOpen(open);
          }
        }}
      >
        <DialogContent className="w-[94vw] max-w-2xl rounded-[18px] border border-border bg-card p-5 shadow-[var(--shadow-card)] sm:p-6">
          <div className="space-y-4">
            <div>
              <h2 className="font-display text-2xl text-foreground">Add your address</h2>
              <p className="text-sm text-muted-foreground">
                OTP confirmed. Choose location on map and add house/apartment details.
              </p>
            </div>

            <div className="overflow-hidden rounded-xl border border-border bg-background">
              <iframe
                title="Signup address map"
                src={signupMapEmbedUrl}
                className="h-52 w-full"
                loading="lazy"
              />
              <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
                <span>{signupAddressState.locationLabel || "Map preview"}</span>
                <a
                  href={signupMapViewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-primary hover:underline"
                >
                  Open full map
                </a>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                onClick={resolveCurrentLocationForSignupAddress}
                disabled={isAddressLocating || isAddressResolvingLocation || isAddressSubmitting}
              >
                <Navigation className="h-4 w-4" />
                {isAddressLocating
                  ? "Locating..."
                  : isAddressResolvingLocation
                    ? "Resolving..."
                    : "Use current location"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                onClick={useSavedLocationForSignupAddress}
                disabled={!selectedLocation || isAddressSubmitting}
              >
                Use selected location
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                placeholder="House no *"
                value={signupAddressState.houseNo}
                onChange={(event) =>
                  setSignupAddressState((prev) => ({ ...prev, houseNo: event.target.value }))
                }
              />
              <Input
                placeholder="Apartment / Flat (optional)"
                value={signupAddressState.apartment}
                onChange={(event) =>
                  setSignupAddressState((prev) => ({ ...prev, apartment: event.target.value }))
                }
              />
            </div>
            <Input
              placeholder="Street / Area *"
              value={signupAddressState.street}
              onChange={(event) =>
                setSignupAddressState((prev) => ({ ...prev, street: event.target.value }))
              }
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                placeholder="City *"
                value={signupAddressState.city}
                onChange={(event) =>
                  setSignupAddressState((prev) => ({ ...prev, city: event.target.value }))
                }
              />
              <Input
                placeholder="Postcode *"
                value={signupAddressState.postcode}
                onChange={(event) =>
                  setSignupAddressState((prev) => ({ ...prev, postcode: event.target.value }))
                }
              />
            </div>
            <Input
              placeholder="Delivery instructions (optional)"
              value={signupAddressState.instructions}
              onChange={(event) =>
                setSignupAddressState((prev) => ({
                  ...prev,
                  instructions: event.target.value,
                }))
              }
            />

            {addressFormError ? (
              <p className="text-xs font-semibold text-destructive">{addressFormError}</p>
            ) : null}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                onClick={() => setIsAddressModalOpen(false)}
                disabled={isAddressSubmitting}
              >
                Later
              </Button>
              <Button
                type="button"
                className="btn-order rounded-full"
                onClick={() => void handleCompleteSignupWithAddress()}
                disabled={isAddressSubmitting}
              >
                {isAddressSubmitting ? "Saving..." : "Complete signup"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </header>
  );
};

export default Header;

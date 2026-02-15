import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, Mail, MessageSquare, MapPin, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type {
  ApiDeliveryZone,
  ApiDeliveryZoneCheckResponse,
  ApiLocationReverseResponse,
  SupportMessage,
} from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  const [loginEmail, setLoginEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [supportMessage, setSupportMessage] = useState("");
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
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const { toast } = useToast();

  const publicZonesQuery = useQuery({
    queryKey: ["public-delivery-zones"],
    queryFn: () => apiFetch<ApiDeliveryZone[]>("/delivery-zones"),
    refetchInterval: 30000,
  });

  const supportUnreadQuery = useQuery({
    queryKey: ["support-unread"],
    queryFn: () => apiFetch<{ count: number }>("/support/unread-count"),
    enabled: Boolean(user),
    refetchInterval: 5000,
  });

  const supportThreadQuery = useQuery({
    queryKey: ["support-thread"],
    queryFn: () =>
      apiFetch<{ thread: { id: string }; messages: SupportMessage[] }>("/support/thread"),
    enabled: Boolean(user) && isSupportOpen,
    refetchInterval: isSupportOpen ? 5000 : false,
  });

  const supportSendMutation = useMutation({
    mutationFn: () =>
      apiFetch("/support/messages", {
        method: "POST",
        body: JSON.stringify({ body: supportMessage }),
      }),
    onSuccess: () => {
      setSupportMessage("");
      supportThreadQuery.refetch();
    },
  });

  const supportReadMutation = useMutation({
    mutationFn: () => apiFetch("/support/read", { method: "POST" }),
  });

  const navLinks = [
    { name: "Home", path: "/" },
    { name: "Menu", path: "/menu" },
    { name: "Deals", path: "/deals" },
    { name: "About", path: "/about" },
    { name: "Contact", path: "/contact" },
  ];

  const isActive = (path: string) => location.pathname === path;
  const formatSupportTime = (value: string) =>
    new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));

  const locationOptions = publicZonesQuery.data ?? [];
  const mapLatitude = pickerDraft?.latitude ?? DEFAULT_MAP_LAT;
  const mapLongitude = pickerDraft?.longitude ?? DEFAULT_MAP_LON;
  const mapBboxDelta = 0.01;
  const locationMapEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${mapLongitude - mapBboxDelta}%2C${mapLatitude - mapBboxDelta}%2C${mapLongitude + mapBboxDelta}%2C${mapLatitude + mapBboxDelta}&layer=mapnik&marker=${mapLatitude}%2C${mapLongitude}`;
  const locationMapViewUrl = `https://www.openstreetmap.org/?mlat=${mapLatitude}&mlon=${mapLongitude}#map=15/${mapLatitude}/${mapLongitude}`;

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
      () => {
        setLocationPickerError("Could not fetch your current location.");
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
            <div className="relative">
              <Button
                variant="outline"
                className="rounded-md px-4"
                onClick={() => {
                  if (!user) {
                    setIsLoginOpen(true);
                    return;
                  }
                  setIsSupportOpen(true);
                }}
              >
                <MessageSquare className="w-4 h-4" />
                Support
              </Button>
              {supportUnreadQuery.data?.count ? (
                <span className="absolute -top-2 -right-2 h-5 min-w-[1.25rem] rounded-sm bg-accent text-accent-foreground text-xs font-bold flex items-center justify-center px-1">
                  {supportUnreadQuery.data.count}
                </span>
              ) : null}
            </div>
            {user ? (
              <Link to="/account">
                <Button className="btn-order">Profile</Button>
              </Link>
            ) : (
              <Button className="btn-order" onClick={() => setIsLoginOpen(true)}>
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
              <div className="relative w-full">
                <Button
                  variant="outline"
                  className="w-full rounded-md flex items-center justify-center gap-2"
                  onClick={() => {
                    setIsOpen(false);
                    if (!user) {
                      setIsLoginOpen(true);
                      return;
                    }
                    setIsSupportOpen(true);
                  }}
                >
                  <MessageSquare className="w-4 h-4" />
                  Support
                </Button>
                {supportUnreadQuery.data?.count ? (
                  <span className="absolute -top-2 -right-2 h-5 min-w-[1.25rem] rounded-sm bg-accent text-accent-foreground text-xs font-bold flex items-center justify-center px-1">
                    {supportUnreadQuery.data.count}
                  </span>
                ) : null}
              </div>
              {user ? (
                <Link to="/account" onClick={() => setIsOpen(false)}>
                  <Button className="btn-order w-full">Profile</Button>
                </Link>
              ) : (
                <Button
                  className="btn-order w-full"
                  onClick={() => {
                    setIsOpen(false);
                    setIsLoginOpen(true);
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

      <Dialog open={isLoginOpen} onOpenChange={setIsLoginOpen}>
      <DialogContent className="w-[92vw] max-w-lg rounded-[18px] border border-border bg-card p-8 shadow-[var(--shadow-card)]">
          <div className="flex flex-col gap-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="font-display text-2xl text-foreground">What's your email?</h2>
              <p className="text-sm text-muted-foreground">
                We'll check if you already have an account.
              </p>
            </div>
            <Input
              type="email"
              placeholder="Email"
              value={loginEmail}
              onChange={(event) => setLoginEmail(event.target.value)}
              className="h-12 rounded-xl"
            />
            <Button
              className="btn-order w-full rounded-full py-6 text-lg"
              disabled={!loginEmail.trim() || isSubmitting}
              onClick={async () => {
                const email = loginEmail.trim();
                if (!email) return;
                setIsSubmitting(true);
                try {
                  await login(email);
                  toast({
                    title: "Welcome back",
                    description: "You're signed in.",
                  });
                  setIsLoginOpen(false);
                  setLoginEmail("");
                  navigate("/account");
                } catch {
                  setIsLoginOpen(false);
                  setLoginEmail("");
                  toast({
                    title: "Let's get you set up",
                    description: "Add your details to finish creating your account.",
                  });
                  navigate(`/account?email=${encodeURIComponent(email)}`);
                } finally {
                  setIsSubmitting(false);
                }
              }}
            >
              {isSubmitting ? "Checking..." : "Continue"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isSupportOpen}
        onOpenChange={(open) => {
          setIsSupportOpen(open);
          if (open) {
            supportReadMutation.mutate();
          }
        }}
      >
        <DialogContent className="flex h-[82vh] max-h-[90vh] w-[95vw] max-w-3xl flex-col overflow-hidden rounded-[18px] border border-border bg-card p-0 text-left shadow-[var(--shadow-card)] sm:h-[72vh]">
          <div className="flex h-full min-h-0 flex-1 flex-col">
            <div className="flex items-start justify-between gap-4 border-b border-border bg-muted/20 px-5 py-4 sm:px-6">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Customer Support</h2>
                <p className="text-xs text-muted-foreground">
                  Send us a message and we will reply shortly.
                </p>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 px-4 py-4 sm:px-6">
              <div className="h-full w-full rounded-[14px] border border-border bg-muted/20">
                <ScrollArea className="h-full w-full px-3 py-3 sm:px-4">
                  <div className="space-y-3">
                  {supportThreadQuery.isLoading ? (
                    <p className="text-sm text-muted-foreground">Loading messages...</p>
                  ) : supportThreadQuery.data?.messages?.length ? (
                    supportThreadQuery.data.messages.map((message) => (
                      <div
                        key={message.id}
                        className={[
                          "flex",
                          message.sender === "CUSTOMER" ? "justify-end" : "justify-start",
                        ].join(" ")}
                      >
                        <div
                          className={[
                            "min-w-[140px] max-w-[88%] rounded-[10px] border px-3 py-2 text-sm leading-relaxed shadow-sm",
                            message.sender === "CUSTOMER"
                              ? "border-primary/50 bg-primary/10 text-foreground"
                              : "border-border bg-background text-foreground",
                          ].join(" ")}
                        >
                          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {message.sender === "CUSTOMER" ? "You" : "Support"} ·{" "}
                            {formatSupportTime(message.createdAt)}
                          </p>
                          {message.body}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No messages yet.</p>
                  )}
                  </div>
                </ScrollArea>
              </div>
            </div>

            <div className="border-t border-border bg-muted/20 px-4 py-4 sm:px-6">
              <div className="rounded-[12px] border border-border bg-background p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                  <Input
                    placeholder="Type your message..."
                    value={supportMessage}
                    onChange={(event) => setSupportMessage(event.target.value)}
                    className="h-11 w-full flex-1 rounded-[10px]"
                  />
                  <Button
                    className="h-11 w-full rounded-[10px] px-6 sm:w-auto"
                    onClick={() => supportSendMutation.mutate()}
                    disabled={!supportMessage.trim() || supportSendMutation.isPending}
                  >
                    {supportSendMutation.isPending ? "Sending..." : "Send"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
};

export default Header;

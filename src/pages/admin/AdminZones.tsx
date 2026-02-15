import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type {
  ApiDeliveryZone,
  ApiDeliveryZoneType,
  ApiLocationReverseResponse,
  ApiLocationSearchResult,
  ApiPaginatedResponse,
  ApiStoreSettings,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Crosshair, MapPin, Navigation, Plus, Search, Trash2 } from "lucide-react";
import PaginationFooter from "@/components/PaginationFooter";

const ZONE_TYPE_LABEL: Record<ApiDeliveryZoneType, string> = {
  POSTCODE_PREFIX: "Postcode/City",
  CIRCLE: "Radius Circle",
};

const DEFAULT_LATITUDE = 53.4808;
const DEFAULT_LONGITUDE = -2.2426;
const DEFAULT_RADIUS_METERS = 3000;

const formatMetersOrKm = (meters: number) => {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km`;
  }
  return `${Math.round(meters)} m`;
};

const postcodePrefixFromValue = (postcode?: string | null) => {
  if (!postcode) return "";
  const cleaned = postcode.trim().toUpperCase();
  if (!cleaned) return "";
  return cleaned.split(/\s+/)[0] ?? "";
};

const AdminZones = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [currentPage, setCurrentPage] = useState(1);

  const zonesQuery = useQuery({
    queryKey: ["admin-delivery-zones", currentPage],
    queryFn: () =>
      apiFetch<ApiPaginatedResponse<ApiDeliveryZone>>(
        `/admin/delivery-zones?page=${currentPage}&pageSize=10`,
      ),
  });

  const settingsQuery = useQuery({
    queryKey: ["store-settings"],
    queryFn: () => apiFetch<ApiStoreSettings>("/settings"),
  });

  const [zoneForm, setZoneForm] = useState({
    name: "",
    type: "POSTCODE_PREFIX" as ApiDeliveryZoneType,
    city: "Manchester",
    postcodePrefixes: "M",
    centerLatitude: "",
    centerLongitude: "",
    radiusMeters: "",
    isActive: true,
  });

  const [storeLocationForm, setStoreLocationForm] = useState({
    latitude: "",
    longitude: "",
  });
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
  const [mapPickerDraft, setMapPickerDraft] = useState({
    latitude: DEFAULT_LATITUDE,
    longitude: DEFAULT_LONGITUDE,
    radiusMeters: DEFAULT_RADIUS_METERS,
    city: "",
    postcode: "",
    displayName: "",
  });
  const [mapAddressQuery, setMapAddressQuery] = useState("");
  const [mapSearchResults, setMapSearchResults] = useState<ApiLocationSearchResult[]>([]);
  const [isSearchingMap, setIsSearchingMap] = useState(false);
  const [isLocatingMap, setIsLocatingMap] = useState(false);
  const [mapPickerError, setMapPickerError] = useState<string | null>(null);

  useEffect(() => {
    if (!settingsQuery.data) return;
    setStoreLocationForm({
      latitude:
        settingsQuery.data.storeLatitude !== null &&
        settingsQuery.data.storeLatitude !== undefined
          ? String(settingsQuery.data.storeLatitude)
          : "",
      longitude:
        settingsQuery.data.storeLongitude !== null &&
        settingsQuery.data.storeLongitude !== undefined
          ? String(settingsQuery.data.storeLongitude)
          : "",
    });
  }, [settingsQuery.data]);

  useEffect(() => {
    if (!settingsQuery.data) return;
    const storeLat = settingsQuery.data.storeLatitude;
    const storeLng = settingsQuery.data.storeLongitude;
    if (storeLat === null || storeLat === undefined || storeLng === null || storeLng === undefined) {
      return;
    }

    setMapPickerDraft((prev) => ({
      ...prev,
      latitude: prev.latitude || storeLat,
      longitude: prev.longitude || storeLng,
    }));
  }, [settingsQuery.data]);

  const createZoneMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiFetch<ApiDeliveryZone>("/admin/delivery-zones", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-delivery-zones"] });
      setCurrentPage(1);
      setZoneForm((prev) => ({
        ...prev,
        name: "",
        centerLatitude: "",
        centerLongitude: "",
        radiusMeters: "",
      }));
      toast({
        title: "Zone added",
        description: "Delivery zone is now saved and active.",
      });
    },
  });

  const updateZoneMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      apiFetch<ApiDeliveryZone>(`/admin/delivery-zones/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-delivery-zones"] });
    },
  });

  const deleteZoneMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ ok: true }>(`/admin/delivery-zones/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-delivery-zones"] });
      setCurrentPage(1);
      toast({
        title: "Zone removed",
        description: "Delivery zone deleted successfully.",
      });
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiFetch<ApiStoreSettings>("/admin/settings", {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-settings"] });
      toast({
        title: "Store location saved",
        description: "Store coordinates are updated.",
      });
    },
  });

  const zoneItems = zonesQuery.data?.items ?? [];

  const isZoneFormValid = useMemo(() => {
    if (!zoneForm.name.trim()) return false;
    if (zoneForm.type === "POSTCODE_PREFIX") {
      const hasCity = Boolean(zoneForm.city.trim());
      const hasPrefix = Boolean(zoneForm.postcodePrefixes.trim());
      return hasCity || hasPrefix;
    }
    return Boolean(
      zoneForm.centerLatitude.trim() &&
        zoneForm.centerLongitude.trim() &&
        zoneForm.radiusMeters.trim(),
    );
  }, [zoneForm]);

  const circleRadiusMeters = useMemo(() => {
    const parsed = Number(zoneForm.radiusMeters);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }, [zoneForm.radiusMeters]);

  const circleCoverageAreaSqKm = useMemo(() => {
    if (!circleRadiusMeters) return 0;
    return (Math.PI * circleRadiusMeters * circleRadiusMeters) / 1_000_000;
  }, [circleRadiusMeters]);

  const mapBboxDelta = useMemo(() => {
    const byRadius = Math.max(mapPickerDraft.radiusMeters / 100_000, 0.015);
    return byRadius;
  }, [mapPickerDraft.radiusMeters]);

  const mapPreviewUrl = useMemo(() => {
    const bbox = [
      mapPickerDraft.longitude - mapBboxDelta,
      mapPickerDraft.latitude - mapBboxDelta,
      mapPickerDraft.longitude + mapBboxDelta,
      mapPickerDraft.latitude + mapBboxDelta,
    ].join(",");
    const params = new URLSearchParams({
      bbox,
      layer: "mapnik",
      marker: `${mapPickerDraft.latitude},${mapPickerDraft.longitude}`,
    });
    return `https://www.openstreetmap.org/export/embed.html?${params.toString()}`;
  }, [mapPickerDraft.latitude, mapPickerDraft.longitude, mapBboxDelta]);

  const mapViewUrl = useMemo(
    () =>
      `https://www.openstreetmap.org/?mlat=${mapPickerDraft.latitude}&mlon=${mapPickerDraft.longitude}#map=14/${mapPickerDraft.latitude}/${mapPickerDraft.longitude}`,
    [mapPickerDraft.latitude, mapPickerDraft.longitude],
  );

  const handleCreateZone = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const postcodePrefixes = zoneForm.postcodePrefixes
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);

    const payload: Record<string, unknown> = {
      name: zoneForm.name.trim(),
      type: zoneForm.type,
      city: zoneForm.city.trim() || undefined,
      postcodePrefixes,
      isActive: zoneForm.isActive,
    };

    if (zoneForm.type === "CIRCLE") {
      payload.centerLatitude = Number(zoneForm.centerLatitude);
      payload.centerLongitude = Number(zoneForm.centerLongitude);
      payload.radiusMeters = Number(zoneForm.radiusMeters);
    }

    createZoneMutation.mutate(payload);
  };

  const handleSaveStoreLocation = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateSettingsMutation.mutate({
      storeLatitude: storeLocationForm.latitude.trim()
        ? Number(storeLocationForm.latitude)
        : null,
      storeLongitude: storeLocationForm.longitude.trim()
        ? Number(storeLocationForm.longitude)
        : null,
    });
  };

  const openMapPicker = () => {
    const latFromForm = Number(zoneForm.centerLatitude);
    const lngFromForm = Number(zoneForm.centerLongitude);
    const radiusFromForm = Number(zoneForm.radiusMeters);
    const storeLat = Number(storeLocationForm.latitude);
    const storeLng = Number(storeLocationForm.longitude);

    const fallbackLatitude =
      Number.isFinite(latFromForm) && latFromForm !== 0
        ? latFromForm
        : Number.isFinite(storeLat)
          ? storeLat
          : DEFAULT_LATITUDE;
    const fallbackLongitude =
      Number.isFinite(lngFromForm) && lngFromForm !== 0
        ? lngFromForm
        : Number.isFinite(storeLng)
          ? storeLng
          : DEFAULT_LONGITUDE;
    const fallbackRadius =
      Number.isFinite(radiusFromForm) && radiusFromForm > 0
        ? radiusFromForm
        : DEFAULT_RADIUS_METERS;

    setMapPickerDraft((prev) => ({
      ...prev,
      latitude: fallbackLatitude,
      longitude: fallbackLongitude,
      radiusMeters: fallbackRadius,
      city: zoneForm.city,
      postcode: zoneForm.postcodePrefixes.split(",")[0]?.trim() ?? "",
      displayName: "",
    }));
    setMapAddressQuery("");
    setMapSearchResults([]);
    setMapPickerError(null);
    setIsMapPickerOpen(true);
  };

  const handleSearchAddress = async () => {
    const term = mapAddressQuery.trim();
    if (term.length < 2) {
      setMapPickerError("Please enter at least 2 characters to search.");
      return;
    }
    setIsSearchingMap(true);
    setMapPickerError(null);
    try {
      const results = await apiFetch<ApiLocationSearchResult[]>(
        `/location/search?q=${encodeURIComponent(term)}`,
      );
      setMapSearchResults(results);
      if (results.length === 0) {
        setMapPickerError("No address results found.");
      }
    } catch {
      setMapPickerError("Address search is unavailable right now.");
    } finally {
      setIsSearchingMap(false);
    }
  };

  const handleUseCurrentLocationForZone = () => {
    if (!navigator.geolocation) {
      setMapPickerError("Location is not supported in this browser.");
      return;
    }

    setIsLocatingMap(true);
    setMapPickerError(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = Number(position.coords.latitude.toFixed(6));
        const longitude = Number(position.coords.longitude.toFixed(6));
        setMapPickerDraft((prev) => ({
          ...prev,
          latitude,
          longitude,
        }));
        try {
          const reverse = await apiFetch<ApiLocationReverseResponse>(
            `/location/reverse?lat=${latitude}&lon=${longitude}`,
          );
          setMapPickerDraft((prev) => ({
            ...prev,
            latitude,
            longitude,
            displayName: reverse.displayName ?? prev.displayName,
            city: reverse.city ?? prev.city,
            postcode: reverse.postcode ?? prev.postcode,
          }));
        } catch {
          // Keep coordinates even if reverse lookup fails.
        } finally {
          setIsLocatingMap(false);
        }
      },
      () => {
        setMapPickerError("Could not fetch your current location.");
        setIsLocatingMap(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  };

  const applyMapPickerToZone = () => {
    setZoneForm((prev) => ({
      ...prev,
      type: "CIRCLE",
      centerLatitude: mapPickerDraft.latitude.toFixed(6),
      centerLongitude: mapPickerDraft.longitude.toFixed(6),
      radiusMeters: String(Math.round(mapPickerDraft.radiusMeters)),
      city: mapPickerDraft.city || prev.city,
      postcodePrefixes:
        postcodePrefixFromValue(mapPickerDraft.postcode) || prev.postcodePrefixes,
    }));
    setIsMapPickerOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-primary/40 bg-gradient-to-r from-primary/20 via-secondary/15 to-background p-5 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-black/70">
              Delivery Zones
            </p>
            <h1 className="mt-2 font-display text-4xl text-foreground">Service Coverage</h1>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Phase 1 and 2 are live here: postcode/city zones and radius-based geo zones. No paid
              API key is required for this setup.
            </p>
          </div>
          <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-muted-foreground">
            Keyless mode active
          </span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <form
          onSubmit={handleSaveStoreLocation}
          className="rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-card)]"
        >
          <div className="mb-4 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <h2 className="font-display text-xl text-foreground">Store Location</h2>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            Optional, used when you create circle zones based on distance.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              placeholder="Latitude (e.g. 53.4808)"
              value={storeLocationForm.latitude}
              onChange={(event) =>
                setStoreLocationForm((prev) => ({ ...prev, latitude: event.target.value }))
              }
            />
            <Input
              placeholder="Longitude (e.g. -2.2426)"
              value={storeLocationForm.longitude}
              onChange={(event) =>
                setStoreLocationForm((prev) => ({ ...prev, longitude: event.target.value }))
              }
            />
          </div>
          <div className="mt-4">
            <Button
              type="submit"
              className="rounded-full px-6"
              disabled={updateSettingsMutation.isPending}
            >
              {updateSettingsMutation.isPending ? "Saving..." : "Save Store Location"}
            </Button>
          </div>
        </form>

        <form
          onSubmit={handleCreateZone}
          className="rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-card)]"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-display text-xl text-foreground">Add Zone</h2>
            <div className="flex items-center gap-2">
              <Label htmlFor="zone-active" className="text-xs text-muted-foreground">
                Active
              </Label>
              <Switch
                id="zone-active"
                checked={zoneForm.isActive}
                onCheckedChange={(checked) =>
                  setZoneForm((prev) => ({ ...prev, isActive: checked }))
                }
              />
            </div>
          </div>
          <div className="grid gap-3">
            <Input
              placeholder="Zone name (e.g. Manchester Central)"
              value={zoneForm.name}
              onChange={(event) =>
                setZoneForm((prev) => ({ ...prev, name: event.target.value }))
              }
            />
            <select
              value={zoneForm.type}
              onChange={(event) =>
                setZoneForm((prev) => ({
                  ...prev,
                  type: event.target.value as ApiDeliveryZoneType,
                }))
              }
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="POSTCODE_PREFIX">Postcode / City</option>
              <option value="CIRCLE">Radius Circle</option>
            </select>
            <Input
              placeholder="City (optional, e.g. Manchester)"
              value={zoneForm.city}
              onChange={(event) =>
                setZoneForm((prev) => ({ ...prev, city: event.target.value }))
              }
            />
            <Input
              placeholder="Postcode prefixes, comma-separated (e.g. M, M1, M2)"
              value={zoneForm.postcodePrefixes}
              onChange={(event) =>
                setZoneForm((prev) => ({ ...prev, postcodePrefixes: event.target.value }))
              }
            />
            {zoneForm.type === "CIRCLE" && (
              <div className="space-y-3 rounded-2xl border border-border bg-background p-3">
                <div className="grid gap-3 sm:grid-cols-3">
                  <Input
                    placeholder="Center lat"
                    value={zoneForm.centerLatitude}
                    onChange={(event) =>
                      setZoneForm((prev) => ({ ...prev, centerLatitude: event.target.value }))
                    }
                  />
                  <Input
                    placeholder="Center lng"
                    value={zoneForm.centerLongitude}
                    onChange={(event) =>
                      setZoneForm((prev) => ({ ...prev, centerLongitude: event.target.value }))
                    }
                  />
                  <Input
                    placeholder="Radius meters"
                    value={zoneForm.radiusMeters}
                    onChange={(event) =>
                      setZoneForm((prev) => ({ ...prev, radiusMeters: event.target.value }))
                    }
                  />
                </div>
                {circleRadiusMeters > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Zone length: radius {formatMetersOrKm(circleRadiusMeters)} • diameter{" "}
                    {formatMetersOrKm(circleRadiusMeters * 2)} • area{" "}
                    {circleCoverageAreaSqKm.toFixed(2)} km²
                  </p>
                )}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full rounded-full"
                  onClick={openMapPicker}
                >
                  <Crosshair className="h-4 w-4" />
                  Open Map Picker
                </Button>
              </div>
            )}
          </div>
          <div className="mt-4">
            <Button
              type="submit"
              disabled={!isZoneFormValid || createZoneMutation.isPending}
              className="rounded-full px-6"
            >
              <Plus className="h-4 w-4" />
              {createZoneMutation.isPending ? "Adding..." : "Add Zone"}
            </Button>
          </div>
        </form>
      </div>

      <div className="rounded-3xl border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="border-b border-border px-5 py-3 text-sm text-muted-foreground">
          Saved zones ({zonesQuery.data?.totalItems ?? 0})
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[920px] w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-5 py-4">Name</th>
                <th className="px-5 py-4">Type</th>
                <th className="px-5 py-4">Coverage</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Created</th>
                <th className="px-5 py-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {zonesQuery.isLoading ? (
                <tr>
                  <td className="px-5 py-6 text-muted-foreground" colSpan={6}>
                    Loading zones...
                  </td>
                </tr>
              ) : zoneItems.length === 0 ? (
                <tr>
                  <td className="px-5 py-6 text-muted-foreground" colSpan={6}>
                    No zones added yet.
                  </td>
                </tr>
              ) : (
                zoneItems.map((zone) => (
                  <tr key={zone.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-4 font-semibold text-foreground">{zone.name}</td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {ZONE_TYPE_LABEL[zone.type]}
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {zone.type === "POSTCODE_PREFIX"
                        ? [
                            zone.city ? `City: ${zone.city}` : null,
                            zone.postcodePrefixes.length > 0
                              ? `Prefixes: ${zone.postcodePrefixes.join(", ")}`
                              : null,
                          ]
                            .filter(Boolean)
                            .join(" • ") || "Not set"
                        : `Center: ${zone.centerLatitude ?? "—"}, ${zone.centerLongitude ?? "—"} • Radius: ${
                            zone.radiusMeters ?? "—"
                          }m`}
                    </td>
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        className={[
                          "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                          zone.isActive
                            ? "border-secondary/40 bg-secondary/20 text-brand-black"
                            : "border-border bg-background text-muted-foreground",
                        ].join(" ")}
                        onClick={() =>
                          updateZoneMutation.mutate({
                            id: zone.id,
                            payload: { isActive: !zone.isActive },
                          })
                        }
                      >
                        {zone.isActive ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {new Date(zone.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const confirmed = window.confirm(
                            `Delete zone "${zone.name}"?`,
                          );
                          if (confirmed) {
                            deleteZoneMutation.mutate(zone.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!zonesQuery.isLoading && zonesQuery.data ? (
          <PaginationFooter
            currentPage={zonesQuery.data.page}
            totalPages={zonesQuery.data.totalPages}
            totalItems={zonesQuery.data.totalItems}
            startItem={
              zonesQuery.data.totalItems === 0
                ? 0
                : (zonesQuery.data.page - 1) * zonesQuery.data.pageSize + 1
            }
            endItem={Math.min(
              zonesQuery.data.page * zonesQuery.data.pageSize,
              zonesQuery.data.totalItems,
            )}
            label="zone"
            onPageChange={setCurrentPage}
          />
        ) : null}
      </div>

      <Dialog open={isMapPickerOpen} onOpenChange={setIsMapPickerOpen}>
        <DialogContent className="w-[96vw] max-w-3xl rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <div className="space-y-4">
            <div>
              <h2 className="font-display text-2xl text-foreground">Map Zone Picker</h2>
              <p className="text-sm text-muted-foreground">
                Search address or use current location, then set your delivery zone radius.
              </p>
            </div>

            <div className="overflow-hidden rounded-xl border border-border bg-background">
              <iframe
                title="Zone map preview"
                src={mapPreviewUrl}
                className="h-64 w-full"
                loading="lazy"
              />
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-3 py-2 text-xs text-muted-foreground">
                <span>
                  Center: {mapPickerDraft.latitude.toFixed(6)}, {mapPickerDraft.longitude.toFixed(6)}
                </span>
                <a
                  href={mapViewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-primary hover:underline"
                >
                  Open full map
                </a>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
              <Input
                placeholder="Search address (e.g. Manchester M1)"
                value={mapAddressQuery}
                onChange={(event) => setMapAddressQuery(event.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  void handleSearchAddress();
                }}
                disabled={isSearchingMap}
              >
                <Search className="h-4 w-4" />
                {isSearchingMap ? "Searching..." : "Search"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleUseCurrentLocationForZone}
                disabled={isLocatingMap}
              >
                <Navigation className="h-4 w-4" />
                {isLocatingMap ? "Locating..." : "Use current"}
              </Button>
            </div>

            {mapSearchResults.length > 0 && (
              <div className="max-h-36 space-y-2 overflow-y-auto rounded-xl border border-border bg-background p-2">
                {mapSearchResults.map((result) => (
                  <button
                    key={`${result.latitude}-${result.longitude}-${result.displayName}`}
                    type="button"
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-left text-xs transition-colors hover:border-primary"
                    onClick={() => {
                      setMapPickerDraft((prev) => ({
                        ...prev,
                        latitude: result.latitude,
                        longitude: result.longitude,
                        city: result.city ?? prev.city,
                        postcode: result.postcode ?? prev.postcode,
                        displayName: result.displayName,
                      }));
                    }}
                  >
                    <p className="font-semibold text-foreground">{result.displayName}</p>
                    <p className="text-muted-foreground">
                      {result.city ?? "Unknown city"} {result.postcode ?? ""}
                    </p>
                  </button>
                ))}
              </div>
            )}

            <div className="rounded-xl border border-border bg-background p-3">
              <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>Radius</span>
                <span>{Math.round(mapPickerDraft.radiusMeters)} m</span>
              </div>
              <input
                type="range"
                min={500}
                max={20000}
                step={100}
                value={mapPickerDraft.radiusMeters}
                onChange={(event) =>
                  setMapPickerDraft((prev) => ({
                    ...prev,
                    radiusMeters: Number(event.target.value),
                  }))
                }
                className="w-full"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Zone length: radius {formatMetersOrKm(mapPickerDraft.radiusMeters)} • diameter{" "}
                {formatMetersOrKm(mapPickerDraft.radiusMeters * 2)} • area{" "}
                {(Math.PI * mapPickerDraft.radiusMeters * mapPickerDraft.radiusMeters / 1_000_000).toFixed(2)} km²
              </p>
              {mapPickerDraft.displayName && (
                <p className="mt-2 text-xs font-semibold text-foreground">{mapPickerDraft.displayName}</p>
              )}
              {(mapPickerDraft.city || mapPickerDraft.postcode) && (
                <p className="text-xs text-muted-foreground">
                  {[mapPickerDraft.city, mapPickerDraft.postcode].filter(Boolean).join(", ")}
                </p>
              )}
            </div>

            {mapPickerError && (
              <p className="text-xs font-semibold text-destructive">{mapPickerError}</p>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsMapPickerOpen(false)}>
                Cancel
              </Button>
              <Button type="button" className="btn-order" onClick={applyMapPickerToZone}>
                Apply Zone
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminZones;

import { Injectable, ServiceUnavailableException } from "@nestjs/common";

interface NominatimReverseResponse {
  display_name?: string;
  address?: {
    house_number?: string;
    road?: string;
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    postcode?: string;
    suburb?: string;
    neighbourhood?: string;
  };
}

interface NominatimSearchResult {
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    postcode?: string;
  };
}

@Injectable()
export class LocationService {
  private lastRequestAt = 0;
  private readonly baseUrl =
    process.env.NOMINATIM_BASE_URL ?? "https://nominatim.openstreetmap.org";
  private readonly contactEmail = process.env.NOMINATIM_EMAIL;

  private async rateLimit() {
    const now = Date.now();
    const elapsed = now - this.lastRequestAt;
    const minInterval = 1100;
    if (elapsed < minInterval) {
      await new Promise((resolve) => setTimeout(resolve, minInterval - elapsed));
    }
    this.lastRequestAt = Date.now();
  }

  async reverseGeocode(lat: number, lon: number) {
    await this.rateLimit();

    const url = new URL("/reverse", this.baseUrl);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lon));
    url.searchParams.set("addressdetails", "1");
    if (this.contactEmail) {
      url.searchParams.set("email", this.contactEmail);
    }

    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": "BurgerBoyz/1.0 (location-service)",
        "Accept-Language": "en",
      },
    });

    if (!response.ok) {
      throw new ServiceUnavailableException("Location service is temporarily unavailable.");
    }

    const payload = (await response.json()) as NominatimReverseResponse;
    const address = payload.address ?? {};
    const city = address.city ?? address.town ?? address.village ?? address.county ?? null;
    const line1 =
      [address.house_number, address.road].filter(Boolean).join(" ").trim() ||
      address.suburb ||
      address.neighbourhood ||
      null;

    return {
      latitude: lat,
      longitude: lon,
      displayName: payload.display_name ?? null,
      line1,
      city,
      postcode: address.postcode ?? null,
      state: address.state ?? null,
    };
  }

  async searchLocation(query: string) {
    const term = query.trim();
    if (!term) {
      return [];
    }

    await this.rateLimit();

    const url = new URL("/search", this.baseUrl);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("q", term);
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("limit", "6");
    if (this.contactEmail) {
      url.searchParams.set("email", this.contactEmail);
    }

    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": "BurgerBoyz/1.0 (location-service)",
        "Accept-Language": "en",
      },
    });

    if (!response.ok) {
      throw new ServiceUnavailableException("Location search is temporarily unavailable.");
    }

    const payload = (await response.json()) as NominatimSearchResult[];
    return payload.map((item) => ({
      displayName: item.display_name,
      latitude: Number(item.lat),
      longitude: Number(item.lon),
      city:
        item.address?.city ??
        item.address?.town ??
        item.address?.village ??
        item.address?.county ??
        null,
      postcode: item.address?.postcode ?? null,
    }));
  }
}

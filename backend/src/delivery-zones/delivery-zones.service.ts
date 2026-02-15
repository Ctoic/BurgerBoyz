import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { DeliveryZone, DeliveryZoneType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { buildPaginatedResponse, resolvePage, resolvePageSize } from "../common/pagination";
import { CheckDeliveryZoneDto } from "./dto/check-delivery-zone.dto";
import { CreateDeliveryZoneDto } from "./dto/create-delivery-zone.dto";
import { ListDeliveryZonesQueryDto } from "./dto/list-delivery-zones-query.dto";
import { UpdateDeliveryZoneDto } from "./dto/update-delivery-zone.dto";

interface DeliveryZoneAddressInput {
  city?: string;
  postcode?: string;
  latitude?: number;
  longitude?: number;
}

const EARTH_RADIUS_METERS = 6_371_000;

@Injectable()
export class DeliveryZonesService {
  constructor(private prisma: PrismaService) {}

  private normalizePostcode(value?: string | null): string | null {
    if (!value) return null;
    const normalized = value.toUpperCase().replace(/\s+/g, "");
    return normalized.length > 0 ? normalized : null;
  }

  private normalizeCity(value?: string | null): string | null {
    if (!value) return null;
    const normalized = value.trim().toLowerCase();
    return normalized.length > 0 ? normalized : null;
  }

  private normalizePostcodePrefixes(prefixes?: string[]): string[] | undefined {
    if (!prefixes) return undefined;
    const normalized = prefixes
      .map((prefix) => this.normalizePostcode(prefix))
      .filter((prefix): prefix is string => Boolean(prefix));
    return [...new Set(normalized)];
  }

  private sanitizeString(value?: string): string | null | undefined {
    if (value === undefined) return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private assertValidZonePayload(payload: {
    type: DeliveryZoneType;
    city?: string | null;
    postcodePrefixes: string[];
    centerLatitude?: number | null;
    centerLongitude?: number | null;
    radiusMeters?: number | null;
  }) {
    if (payload.type === DeliveryZoneType.POSTCODE_PREFIX) {
      if (!payload.city && payload.postcodePrefixes.length === 0) {
        throw new BadRequestException(
          "Postcode/city zone needs at least one postcode prefix or a city.",
        );
      }
      return;
    }

    if (
      payload.centerLatitude === null ||
      payload.centerLatitude === undefined ||
      payload.centerLongitude === null ||
      payload.centerLongitude === undefined ||
      payload.radiusMeters === null ||
      payload.radiusMeters === undefined
    ) {
      throw new BadRequestException(
        "Circle zone requires center latitude, center longitude and radius.",
      );
    }
  }

  private toRadians(degrees: number) {
    return (degrees * Math.PI) / 180;
  }

  private distanceMeters(
    latitudeA: number,
    longitudeA: number,
    latitudeB: number,
    longitudeB: number,
  ) {
    const latA = this.toRadians(latitudeA);
    const latB = this.toRadians(latitudeB);
    const deltaLat = this.toRadians(latitudeB - latitudeA);
    const deltaLng = this.toRadians(longitudeB - longitudeA);
    const a =
      Math.sin(deltaLat / 2) ** 2 +
      Math.cos(latA) * Math.cos(latB) * Math.sin(deltaLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return EARTH_RADIUS_METERS * c;
  }

  private matchesByPostcodeOrCity(
    zone: DeliveryZone,
    normalizedPostcode: string | null,
    normalizedCity: string | null,
  ) {
    const hasPrefixMatch =
      Boolean(normalizedPostcode) &&
      zone.postcodePrefixes.some((prefix) => {
        const normalizedPrefix = this.normalizePostcode(prefix);
        return normalizedPrefix ? normalizedPostcode?.startsWith(normalizedPrefix) : false;
      });

    const hasCityMatch =
      Boolean(normalizedCity) &&
      Boolean(zone.city) &&
      this.normalizeCity(zone.city) === normalizedCity;

    return hasPrefixMatch || hasCityMatch;
  }

  private matchesCircle(
    zone: DeliveryZone,
    latitude?: number,
    longitude?: number,
  ) {
    if (
      latitude === undefined ||
      longitude === undefined ||
      zone.centerLatitude === null ||
      zone.centerLongitude === null ||
      zone.radiusMeters === null
    ) {
      return false;
    }

    const distance = this.distanceMeters(
      latitude,
      longitude,
      zone.centerLatitude,
      zone.centerLongitude,
    );
    return distance <= zone.radiusMeters;
  }

  private zoneMatchesAddress(zone: DeliveryZone, input: DeliveryZoneAddressInput) {
    const normalizedPostcode = this.normalizePostcode(input.postcode);
    const normalizedCity = this.normalizeCity(input.city);

    if (zone.type === DeliveryZoneType.CIRCLE) {
      if (this.matchesCircle(zone, input.latitude, input.longitude)) {
        return true;
      }
    }

    return this.matchesByPostcodeOrCity(zone, normalizedPostcode, normalizedCity);
  }

  async listZones(query: ListDeliveryZonesQueryDto) {
    const page = resolvePage(query.page);
    const pageSize = resolvePageSize(query.pageSize);
    const search = query.search?.trim();

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { city: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : undefined;

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.deliveryZone.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.deliveryZone.count({ where }),
    ]);

    return buildPaginatedResponse(items, totalItems, page, pageSize);
  }

  async listActiveZones() {
    return this.prisma.deliveryZone.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
    });
  }

  async createZone(dto: CreateDeliveryZoneDto) {
    const name = dto.name.trim();
    if (!name) {
      throw new BadRequestException("Zone name is required.");
    }

    const city = this.sanitizeString(dto.city) ?? null;
    const postcodePrefixes = this.normalizePostcodePrefixes(dto.postcodePrefixes) ?? [];
    this.assertValidZonePayload({
      type: dto.type,
      city,
      postcodePrefixes,
      centerLatitude: dto.centerLatitude,
      centerLongitude: dto.centerLongitude,
      radiusMeters: dto.radiusMeters,
    });

    return this.prisma.deliveryZone.create({
      data: {
        name,
        type: dto.type,
        city,
        postcodePrefixes,
        centerLatitude: dto.centerLatitude,
        centerLongitude: dto.centerLongitude,
        radiusMeters: dto.radiusMeters,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateZone(id: string, dto: UpdateDeliveryZoneDto) {
    const existing = await this.prisma.deliveryZone.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException("Delivery zone not found.");
    }

    const sanitizedName = dto.name !== undefined ? dto.name.trim() : undefined;
    if (sanitizedName !== undefined && !sanitizedName) {
      throw new BadRequestException("Zone name is required.");
    }

    const sanitizedCity = this.sanitizeString(dto.city);
    const normalizedPrefixes = this.normalizePostcodePrefixes(dto.postcodePrefixes);

    const nextZone = {
      type: dto.type ?? existing.type,
      city: sanitizedCity !== undefined ? sanitizedCity : existing.city,
      postcodePrefixes: normalizedPrefixes ?? existing.postcodePrefixes,
      centerLatitude:
        dto.centerLatitude !== undefined ? dto.centerLatitude : existing.centerLatitude,
      centerLongitude:
        dto.centerLongitude !== undefined ? dto.centerLongitude : existing.centerLongitude,
      radiusMeters: dto.radiusMeters !== undefined ? dto.radiusMeters : existing.radiusMeters,
    };
    this.assertValidZonePayload(nextZone);

    return this.prisma.deliveryZone.update({
      where: { id },
      data: {
        name: sanitizedName,
        type: dto.type,
        city: sanitizedCity === undefined ? undefined : sanitizedCity,
        postcodePrefixes: normalizedPrefixes,
        centerLatitude: dto.centerLatitude,
        centerLongitude: dto.centerLongitude,
        radiusMeters: dto.radiusMeters,
        isActive: dto.isActive,
      },
    });
  }

  async deleteZone(id: string) {
    await this.prisma.deliveryZone.delete({
      where: { id },
    });
    return { ok: true };
  }

  async checkAddress(input: CheckDeliveryZoneDto | DeliveryZoneAddressInput) {
    const activeZones = await this.prisma.deliveryZone.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
    });

    if (activeZones.length === 0) {
      return {
        deliverable: true,
        reason: "No active delivery zones configured yet.",
        matchedZone: null,
      };
    }

    const matchedZone =
      activeZones.find((zone) => this.zoneMatchesAddress(zone, input)) ?? null;

    if (!matchedZone) {
      return {
        deliverable: false,
        reason: "Address is outside configured delivery zones.",
        matchedZone: null,
      };
    }

    return {
      deliverable: true,
      reason: "Address is in delivery range.",
      matchedZone: {
        id: matchedZone.id,
        name: matchedZone.name,
        type: matchedZone.type,
      },
    };
  }
}

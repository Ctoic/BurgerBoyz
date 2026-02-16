-- CreateEnum
CREATE TYPE "DeliveryZoneType" AS ENUM ('POSTCODE_PREFIX', 'CIRCLE');

-- AlterTable
ALTER TABLE "Address"
ADD COLUMN "latitude" DOUBLE PRECISION,
ADD COLUMN "longitude" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "StoreSettings"
ADD COLUMN "storeLatitude" DOUBLE PRECISION,
ADD COLUMN "storeLongitude" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "DeliveryZone" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "DeliveryZoneType" NOT NULL DEFAULT 'POSTCODE_PREFIX',
    "city" TEXT,
    "postcodePrefixes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "centerLatitude" DOUBLE PRECISION,
    "centerLongitude" DOUBLE PRECISION,
    "radiusMeters" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryZone_pkey" PRIMARY KEY ("id")
);

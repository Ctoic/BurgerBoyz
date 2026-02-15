export type ApiOrderStatus =
  | "PLACED"
  | "PREPARING"
  | "READY_FOR_PICKUP"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED";

export type ApiPaymentMethod = "CASH" | "STRIPE";
export type ApiFulfillmentType = "DELIVERY" | "PICKUP";
export type ApiOrderType = "NORMAL" | "DEAL";
export type ApiDeliveryZoneType = "POSTCODE_PREFIX" | "CIRCLE";

export interface ApiPaginatedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface ApiAddOn {
  id: string;
  name: string;
  priceCents: number;
  isActive?: boolean;
}

export interface ApiMenuItem {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  imageUrl?: string | null;
  isPopular?: boolean;
  addOns: ApiAddOn[];
}

export interface ApiDealBundleItem {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  quantity: number;
  imageUrl?: string | null;
  isPopular?: boolean;
  categoryName: string;
}

export interface ApiDeal {
  id: string;
  name: string;
  description: string;
  tag: string;
  imageUrl?: string | null;
  discountCents: number;
  subtotalCents: number;
  finalPriceCents: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  bundleItems: ApiDealBundleItem[];
}

export interface ApiMenuCategory {
  id: string;
  name: string;
  position?: number;
  items: ApiMenuItem[];
}

export interface ApiOrderItemAddOn {
  id: string;
  name: string;
  priceCents: number;
}

export interface ApiOrderItem {
  id: string;
  name: string;
  description?: string | null;
  basePriceCents: number;
  quantity: number;
  removals: string[];
  addOns: ApiOrderItemAddOn[];
}

export interface ApiAddress {
  line1: string;
  line2?: string | null;
  city: string;
  postcode: string;
  instructions?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface ApiOrder {
  id: string;
  status: ApiOrderStatus;
  orderType: ApiOrderType;
  paymentMethod: ApiPaymentMethod;
  fulfillmentType: ApiFulfillmentType;
  subtotalCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  address?: ApiAddress | null;
  items: ApiOrderItem[];
  user?: { id: string; email: string } | null;
  createdAt: string;
}

export interface ApiAdminUser {
  id: string;
  email: string;
  role: string;
}

export interface ApiAdminMenuResponse {
  categories: ApiMenuCategory[];
  addOns: ApiAddOn[];
  deals: ApiDeal[];
}

export interface ApiCustomerUser {
  id: string;
  email: string;
  role: string;
  name?: string | null;
  phone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  addressCity?: string | null;
  addressPostcode?: string | null;
  addressInstructions?: string | null;
}

export interface ApiAdminUserListItem {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  name?: string | null;
  phone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  addressCity?: string | null;
  addressPostcode?: string | null;
  addressInstructions?: string | null;
  _count: {
    orders: number;
  };
}

export interface ApiAdminCreateUserPayload {
  email: string;
  name?: string;
  phone?: string;
}

export interface SupportMessage {
  id: string;
  sender: "CUSTOMER" | "ADMIN";
  body: string;
  createdAt: string;
}

export interface SupportThreadSummary {
  id: string;
  user: {
    id: string;
    email: string;
    name?: string | null;
    phone?: string | null;
  };
  lastMessage?: SupportMessage | null;
  unreadCount: number;
  updatedAt: string;
}

export interface ApiPaginatedSupportThreadsResponse
  extends ApiPaginatedResponse<SupportThreadSummary> {
  totalUnreadCount: number;
}

export interface ApiAdminNotificationItem {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  sentAt: string;
  sendCount: number;
}

export interface ApiStoreSettings {
  id: string;
  storeName: string;
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  deliveryFeeCents: number;
  openTime: string;
  closeTime: string;
  storeLatitude?: number | null;
  storeLongitude?: number | null;
}

export interface ApiDeliveryZone {
  id: string;
  name: string;
  type: ApiDeliveryZoneType;
  city?: string | null;
  postcodePrefixes: string[];
  centerLatitude?: number | null;
  centerLongitude?: number | null;
  radiusMeters?: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiDeliveryZoneCheckResponse {
  deliverable: boolean;
  reason: string;
  matchedZone: {
    id: string;
    name: string;
    type: ApiDeliveryZoneType;
  } | null;
}

export interface ApiLocationReverseResponse {
  latitude: number;
  longitude: number;
  displayName: string | null;
  line1: string | null;
  city: string | null;
  postcode: string | null;
  state: string | null;
}

export interface ApiLocationSearchResult {
  displayName: string;
  latitude: number;
  longitude: number;
  city: string | null;
  postcode: string | null;
}

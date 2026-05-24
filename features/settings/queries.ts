import "server-only";
import { prisma } from "@/lib/db/client";
import { getActiveMember, requirePermission } from "@/lib/auth/dal";

export type BusinessSettings = {
  id: string;
  name: string;
  slug: string;
  businessType: string | null;
  phone: string | null;
  email: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  country: string;
  timezone: string;
  currency: string;
};

export async function getBusinessSettings(): Promise<BusinessSettings> {
  const member = await requirePermission("business:read");
  const b = await prisma.business.findUniqueOrThrow({
    where: { id: member.businessId },
  });
  return {
    id: b.id,
    name: b.name,
    slug: b.slug,
    businessType: b.businessType,
    phone: b.phone,
    email: b.email,
    addressLine1: b.addressLine1,
    addressLine2: b.addressLine2,
    city: b.city,
    province: b.province,
    postalCode: b.postalCode,
    country: b.country,
    timezone: b.timezone,
    currency: b.currency,
  };
}

export type ReceiptSettings = {
  receiptHeader: string | null;
  receiptFooter: string | null;
  logoUrl: string | null;
  businessName: string;
};

export async function getReceiptSettings(): Promise<ReceiptSettings> {
  const member = await requirePermission("business:read");
  const b = await prisma.business.findUniqueOrThrow({
    where: { id: member.businessId },
    select: {
      receiptHeader: true,
      receiptFooter: true,
      logoUrl: true,
      name: true,
    },
  });
  return {
    receiptHeader: b.receiptHeader,
    receiptFooter: b.receiptFooter,
    logoUrl: b.logoUrl,
    businessName: b.name,
  };
}

export type TaxSettings = {
  vatRegistered: boolean;
  taxId: string | null;
  defaultTaxRateBps: number;
};

export async function getTaxSettings(): Promise<TaxSettings> {
  const member = await requirePermission("business:read");
  const b = await prisma.business.findUniqueOrThrow({
    where: { id: member.businessId },
    select: { vatRegistered: true, taxId: true, defaultTaxRateBps: true },
  });
  return {
    vatRegistered: b.vatRegistered,
    taxId: b.taxId,
    defaultTaxRateBps: b.defaultTaxRateBps,
  };
}

export type ProfileSettings = {
  email: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
};

export async function getProfileSettings(): Promise<ProfileSettings> {
  const member = await getActiveMember();
  const u = await prisma.user.findUniqueOrThrow({
    where: { id: member.userId },
    select: { email: true, fullName: true, phone: true, avatarUrl: true },
  });
  return {
    email: u.email,
    fullName: u.fullName ?? "",
    phone: u.phone,
    avatarUrl: u.avatarUrl,
  };
}

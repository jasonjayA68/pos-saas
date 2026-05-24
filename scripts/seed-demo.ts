import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", override: false });
loadEnv({ override: false });

import { createClient, type User } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { randomBytes } from "node:crypto";

// ─── CLI args ────────────────────────────────────────────────────────
// Usage:
//   npm run demo:seed
//   npm run demo:seed -- you@example.com 'YourDemoPass'
//   npm run demo:seed -- you@example.com 'YourDemoPass' "Custom Café Name"
const [argEmail, argPassword, argName] = process.argv.slice(2);
const EMAIL = (argEmail ?? "demo@example.com").toLowerCase();
const PASSWORD = argPassword ?? "DemoPass123!";
const BUSINESS_NAME = argName ?? "Bean Scene Café";
const BUSINESS_SLUG = `demo-${BUSINESS_NAME.toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "")}`;

// ─── env ─────────────────────────────────────────────────────────────
function need(name: string, value: string | undefined): string {
  if (!value) {
    console.error(`✘ ${name} is not set in .env.local`);
    process.exit(1);
  }
  return value;
}
const supabaseUrl = need("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
const supabaseSecret = need(
  "SUPABASE_SECRET_KEY",
  process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY,
);
const dbUrl = need("DIRECT_URL or DATABASE_URL", process.env.DIRECT_URL ?? process.env.DATABASE_URL);

const supabase = createClient(supabaseUrl, supabaseSecret, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: dbUrl }),
});

// ─── fixture data ────────────────────────────────────────────────────
const CATEGORIES = [
  "Coffee",
  "Tea & Cold Brew",
  "Frappes",
  "Pastries",
  "Sandwiches",
  "Merch",
] as const;

// `weight` controls how often the product appears in generated sales
// (higher = more popular). Makes the "Top selling products" report look
// realistic instead of uniformly random.
type DemoProduct = {
  category: (typeof CATEGORIES)[number];
  name: string;
  price: number; // pesos
  cost: number;
  weight: number;
};

const PRODUCTS: DemoProduct[] = [
  // Coffee — the workhorses
  { category: "Coffee", name: "Espresso (Single)", price: 85, cost: 28, weight: 4 },
  { category: "Coffee", name: "Espresso (Double)", price: 110, cost: 38, weight: 5 },
  { category: "Coffee", name: "Americano", price: 115, cost: 35, weight: 10 },
  { category: "Coffee", name: "Cappuccino", price: 140, cost: 45, weight: 12 },
  { category: "Coffee", name: "Café Latte", price: 150, cost: 50, weight: 12 },
  { category: "Coffee", name: "Flat White", price: 155, cost: 50, weight: 7 },
  { category: "Coffee", name: "Mocha", price: 165, cost: 58, weight: 6 },
  { category: "Coffee", name: "Caramel Macchiato", price: 175, cost: 62, weight: 8 },

  // Tea & cold brew
  { category: "Tea & Cold Brew", name: "Hot Black Tea", price: 95, cost: 20, weight: 3 },
  { category: "Tea & Cold Brew", name: "Hot Green Tea", price: 95, cost: 20, weight: 3 },
  { category: "Tea & Cold Brew", name: "Chai Latte", price: 145, cost: 45, weight: 5 },
  { category: "Tea & Cold Brew", name: "Iced Lemon Tea", price: 110, cost: 28, weight: 6 },
  { category: "Tea & Cold Brew", name: "Cold Brew", price: 155, cost: 55, weight: 7 },

  // Frappes
  { category: "Frappes", name: "Chocolate Frappe", price: 180, cost: 65, weight: 8 },
  { category: "Frappes", name: "Caramel Frappe", price: 185, cost: 65, weight: 7 },
  { category: "Frappes", name: "Mocha Frappe", price: 185, cost: 65, weight: 6 },
  { category: "Frappes", name: "Strawberry Cream", price: 175, cost: 60, weight: 5 },

  // Pastries
  { category: "Pastries", name: "Butter Croissant", price: 95, cost: 32, weight: 9 },
  { category: "Pastries", name: "Chocolate Croissant", price: 120, cost: 40, weight: 7 },
  { category: "Pastries", name: "Cinnamon Roll", price: 110, cost: 38, weight: 6 },
  { category: "Pastries", name: "Banana Muffin", price: 85, cost: 28, weight: 5 },
  { category: "Pastries", name: "Blueberry Muffin", price: 90, cost: 30, weight: 5 },
  { category: "Pastries", name: "Brownie", price: 95, cost: 32, weight: 6 },

  // Sandwiches
  { category: "Sandwiches", name: "Ham & Cheese", price: 165, cost: 70, weight: 4 },
  { category: "Sandwiches", name: "Tuna Melt", price: 180, cost: 78, weight: 3 },
  { category: "Sandwiches", name: "Club Sandwich", price: 220, cost: 95, weight: 3 },
  { category: "Sandwiches", name: "BLT", price: 195, cost: 82, weight: 3 },

  // Merch — slow movers, look good in low-stock filters
  { category: "Merch", name: "Café Tumbler 16oz", price: 450, cost: 200, weight: 1 },
  { category: "Merch", name: "House Blend Beans 250g", price: 380, cost: 150, weight: 2 },
  { category: "Merch", name: "Ceramic Mug", price: 250, cost: 100, weight: 1 },
];

const CUSTOMERS = [
  { name: "Maria Santos", phone: "0917 123 4567", email: "maria.s@gmail.com" },
  { name: "Juan Dela Cruz", phone: "0917 234 5678", email: null },
  { name: "Anna Reyes", phone: "0917 345 6789", email: "anna.r@gmail.com" },
  { name: "Mark Tan", phone: "0917 456 7890", email: null },
  { name: "Liza Cruz", phone: "0917 567 8901", email: "liza@outlook.com" },
  { name: "Paolo Mendoza", phone: "0917 678 9012", email: null },
  { name: "Sofia Lim", phone: "0917 789 0123", email: "sofia.l@yahoo.com" },
  { name: "Ramon Garcia", phone: "0917 890 1234", email: null },
  { name: "Beatrice Aquino", phone: "0917 901 2345", email: null },
  { name: "Carlo Reyes", phone: "0917 012 3456", email: "carlo@gmail.com" },
];

// Sale generation
const TOTAL_SALES = 120;
const PAYMENT_WEIGHTS: Array<"CASH" | "GCASH" | "PAYMAYA" | "BANK_TRANSFER"> = [
  "CASH", "CASH", "CASH", "CASH", "CASH", // 5/10 cash
  "GCASH", "GCASH", "GCASH",             // 3/10 gcash
  "PAYMAYA",                              // 1/10 maya
  "BANK_TRANSFER",                        // 1/10 bank (rare)
];
const VOIDED_RATIO = 0.03;          // 3% of sales are voided
const CUSTOMER_ATTACH_RATIO = 0.25; // 25% of sales tagged to a customer

const DAY_MS = 24 * 60 * 60 * 1000;

// ─── helpers ─────────────────────────────────────────────────────────
function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

async function findOrCreateAuthUser(): Promise<User> {
  const listed = await supabase.auth.admin.listUsers({ perPage: 200 });
  const existing = listed.data?.users?.find(
    (u) => u.email?.toLowerCase() === EMAIL,
  );
  if (existing) {
    const { error } = await supabase.auth.admin.updateUserById(existing.id, {
      password: PASSWORD,
      email_confirm: true,
    });
    if (error) throw new Error(`Failed to update auth user: ${error.message}`);
    console.log(`✔ Auth user already exists (${existing.id}) — password reset`);
    return existing;
  }
  const { data, error } = await supabase.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: "Demo Owner" },
  });
  if (error || !data.user) {
    throw new Error(`Failed to create auth user: ${error?.message}`);
  }
  console.log(`✔ Created auth user (${data.user.id})`);
  return data.user;
}

// ─── main ────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  console.log(`\n→ Demo tenant: ${BUSINESS_NAME} (${BUSINESS_SLUG})`);
  console.log(`→ Owner login: ${EMAIL} / ${PASSWORD}\n`);

  // 1. Supabase auth user
  const authUser = await findOrCreateAuthUser();

  // 2. Nuke any prior demo with the same slug (cascade cleans children)
  const prior = await prisma.business.findUnique({
    where: { slug: BUSINESS_SLUG },
    select: { id: true },
  });
  if (prior) {
    await prisma.business.delete({ where: { id: prior.id } });
    console.log(`✔ Removed previous demo business (${prior.id})`);
  }

  // 3. Mirror auth user → public.users
  await prisma.user.upsert({
    where: { id: authUser.id },
    update: { email: EMAIL, fullName: "Demo Owner" },
    create: { id: authUser.id, email: EMAIL, fullName: "Demo Owner" },
  });

  // 4. Roles + plan (must be seeded first)
  const ownerRole = await prisma.role.findFirst({
    where: { businessId: null, name: "owner", isSystem: true },
  });
  if (!ownerRole) {
    throw new Error('System role "owner" not found. Run `npm run db:seed` first.');
  }
  const businessPlan = await prisma.plan.findUnique({ where: { code: "business" } });
  if (!businessPlan) {
    throw new Error('Plan "business" not found. Run `npm run db:seed` first.');
  }

  // 5. Business + branch + owner membership
  const now = new Date();
  const business = await prisma.business.create({
    data: {
      name: BUSINESS_NAME,
      slug: BUSINESS_SLUG,
      ownerUserId: authUser.id,
      businessType: "Café / Coffee shop",
      phone: "(02) 8123-4567",
      email: "hello@beanscene.demo",
      addressLine1: "G/F Demo Plaza",
      addressLine2: "123 Ayala Avenue",
      city: "Makati",
      province: "Metro Manila",
      postalCode: "1226",
      country: "PH",
      taxId: "000-123-456-789",
      vatRegistered: true,
      defaultTaxRateBps: 1200,
      receiptHeader: `Welcome to ${BUSINESS_NAME}!`,
      receiptFooter: "Thank you and please come again.\nFollow us @beanscene",
    },
  });
  console.log(`✔ Business created: ${business.id}`);

  const branch = await prisma.branch.create({
    data: {
      businessId: business.id,
      name: "Main",
      isDefault: true,
      address: "G/F Demo Plaza, 123 Ayala Avenue, Makati",
    },
  });

  await prisma.businessMember.create({
    data: {
      businessId: business.id,
      userId: authUser.id,
      roleId: ownerRole.id,
    },
  });

  // 6. ACTIVE subscription — Business plan, ends 30 days from now
  await prisma.subscription.create({
    data: {
      businessId: business.id,
      planId: businessPlan.id,
      status: "ACTIVE",
      currentPeriodStart: new Date(now.getTime() - 7 * DAY_MS),
      currentPeriodEnd: new Date(now.getTime() + 30 * DAY_MS),
    },
  });
  console.log(`✔ Active subscription (Business plan, 30 days remaining)`);

  // 7. Categories
  const categoryByName = new Map<string, string>();
  for (const name of CATEGORIES) {
    const c = await prisma.category.create({
      data: { businessId: business.id, name },
    });
    categoryByName.set(name, c.id);
  }
  console.log(`✔ ${CATEGORIES.length} categories`);

  // 8. Products + initial inventory (200 each) + weighted product pool
  type ProductRow = {
    id: string;
    name: string;
    sku: string;
    priceCentavos: number;
    taxRateBps: number;
  };
  const productRows: ProductRow[] = [];
  const weightedIndex: number[] = [];
  const INITIAL_STOCK = 200;

  for (const [i, p] of PRODUCTS.entries()) {
    const sku = `BSC-${(i + 1).toString().padStart(3, "0")}`;
    const product = await prisma.product.create({
      data: {
        businessId: business.id,
        categoryId: categoryByName.get(p.category) ?? null,
        sku,
        name: p.name,
        priceCentavos: p.price * 100,
        costCentavos: p.cost * 100,
        taxRateBps: 1200,
        trackInventory: true,
      },
    });
    productRows.push({
      id: product.id,
      name: product.name,
      sku: product.sku,
      priceCentavos: product.priceCentavos,
      taxRateBps: product.taxRateBps,
    });
    for (let j = 0; j < p.weight; j++) weightedIndex.push(i);

    await prisma.inventoryLevel.create({
      data: {
        businessId: business.id,
        branchId: branch.id,
        productId: product.id,
        quantity: INITIAL_STOCK,
        reorderPoint: p.category === "Merch" ? 5 : 30,
      },
    });
    await prisma.inventoryMovement.create({
      data: {
        businessId: business.id,
        branchId: branch.id,
        productId: product.id,
        type: "STOCK_IN",
        quantityDelta: INITIAL_STOCK,
        balanceAfter: INITIAL_STOCK,
        reason: "Initial stock",
        createdByUserId: authUser.id,
        createdAt: new Date(now.getTime() - 35 * DAY_MS),
      },
    });
  }
  console.log(`✔ ${productRows.length} products + initial inventory of ${INITIAL_STOCK} each`);

  // 9. Customers
  const customerRows = await Promise.all(
    CUSTOMERS.map((c) =>
      prisma.customer.create({
        data: {
          businessId: business.id,
          name: c.name,
          phone: c.phone,
          email: c.email,
        },
      }),
    ),
  );
  console.log(`✔ ${customerRows.length} customers`);

  // 10. Sales — last 30 days, weekday/weekend + hour-of-day bias for realism
  const inventoryDeductions = new Map<string, number>();
  let cashCount = 0;
  let voidCount = 0;
  let customerTaggedCount = 0;

  for (let i = 0; i < TOTAL_SALES; i++) {
    // More likely on Fri/Sat/Sun, less on Mon
    const daysAgo = randInt(0, 29);
    const saleDate = new Date(now.getTime() - daysAgo * DAY_MS);
    saleDate.setHours(
      // Hour: bias toward 8-11am (morning rush) + 1-3pm (lunch) + 5-7pm (afternoon)
      pick([8, 9, 9, 10, 10, 11, 12, 13, 14, 14, 15, 16, 17, 17, 18, 19]),
      randInt(0, 59),
      randInt(0, 59),
      0,
    );

    const numLines = randInt(1, 4);
    const usedProductIds = new Set<string>();
    type Line = {
      productId: string;
      productName: string;
      productSku: string;
      quantity: number;
      unitPriceCentavos: number;
      taxCentavos: number;
      totalCentavos: number;
    };
    const lines: Line[] = [];
    let subtotal = 0;
    let tax = 0;

    for (let j = 0; j < numLines; j++) {
      // Weighted pick without repeats
      let row: ProductRow;
      let attempts = 0;
      do {
        row = productRows[weightedIndex[Math.floor(Math.random() * weightedIndex.length)]];
        attempts++;
      } while (usedProductIds.has(row.id) && attempts < 10);
      if (usedProductIds.has(row.id)) continue;
      usedProductIds.add(row.id);

      const qty = randInt(1, 3);
      const lineSubtotal = qty * row.priceCentavos;
      const lineTax = Math.round((lineSubtotal * row.taxRateBps) / 10_000);
      const lineTotal = lineSubtotal + lineTax;

      lines.push({
        productId: row.id,
        productName: row.name,
        productSku: row.sku,
        quantity: qty,
        unitPriceCentavos: row.priceCentavos,
        taxCentavos: lineTax,
        totalCentavos: lineTotal,
      });

      subtotal += lineSubtotal;
      tax += lineTax;
      inventoryDeductions.set(row.id, (inventoryDeductions.get(row.id) ?? 0) + qty);
    }

    if (lines.length === 0) continue;

    const total = subtotal + tax;
    const paymentMethod = pick(PAYMENT_WEIGHTS);
    const amountPaid =
      paymentMethod === "CASH"
        ? Math.ceil((total + 1) / 5000) * 5000 // round up to nearest ₱50 — realistic cash tendering
        : total;
    const change = Math.max(0, amountPaid - total);
    if (paymentMethod === "CASH") cashCount++;

    const dateStr = saleDate.toISOString().slice(0, 10).replace(/-/g, "");
    const receiptNumber = `OR-${dateStr}-${randomBytes(3).toString("hex").toUpperCase()}`;

    const attachCustomer = Math.random() < CUSTOMER_ATTACH_RATIO;
    const customerId = attachCustomer ? pick(customerRows).id : null;
    if (attachCustomer) customerTaggedCount++;

    const isVoided = Math.random() < VOIDED_RATIO;
    if (isVoided) voidCount++;

    await prisma.sale.create({
      data: {
        businessId: business.id,
        branchId: branch.id,
        cashierUserId: authUser.id,
        customerId,
        receiptNumber,
        subtotalCentavos: subtotal,
        discountCentavos: 0,
        taxCentavos: tax,
        totalCentavos: total,
        amountPaidCentavos: amountPaid,
        changeCentavos: change,
        paymentMethod,
        paymentStatus: "PAID",
        idempotencyKey: `demo-${i}-${randomBytes(2).toString("hex")}`,
        createdAt: saleDate,
        voidedAt: isVoided ? new Date(saleDate.getTime() + 5 * 60 * 1000) : null,
        voidedByUserId: isVoided ? authUser.id : null,
        voidedReason: isVoided ? pick(["Customer changed mind", "Wrong item rung", "Refund requested"]) : null,
        items: {
          create: lines.map((l) => ({
            businessId: business.id,
            productId: l.productId,
            productName: l.productName,
            productSku: l.productSku,
            quantity: l.quantity,
            unitPriceCentavos: l.unitPriceCentavos,
            taxCentavos: l.taxCentavos,
            totalCentavos: l.totalCentavos,
          })),
        },
      },
    });
  }
  console.log(
    `✔ ${TOTAL_SALES} sales — ${cashCount} cash, ${customerTaggedCount} customer-tagged, ${voidCount} voided`,
  );

  // 11. Apply inventory deductions in bulk
  for (const [productId, deducted] of inventoryDeductions) {
    await prisma.inventoryLevel.update({
      where: {
        businessId_branchId_productId: {
          businessId: business.id,
          branchId: branch.id,
          productId,
        },
      },
      data: { quantity: { decrement: deducted } },
    });
  }
  console.log(`✔ Inventory deducted for ${inventoryDeductions.size} SKUs`);

  // Done!
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✔ Demo tenant ready!

Login URL:  ${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/login
Email:      ${EMAIL}
Password:   ${PASSWORD}
Business:   ${BUSINESS_NAME}
Plan:       Business (active, 30 days remaining)

What's loaded:
  · ${CATEGORIES.length} categories
  · ${productRows.length} products with realistic prices + tax
  · ${customerRows.length} sample customers
  · ${TOTAL_SALES} sales across the last 30 days
  · Inventory levels reflecting actual sales
  · Receipt header/footer + VAT-registered

Take your client through:
  POS         →  ring a fresh sale
  Sales       →  filters, history, export CSV, print receipt
  Products    →  catalog, edit, archive
  Inventory   →  stock levels, movements, low-stock filter
  Reports     →  daily/weekly/monthly sales, top products, payments
  Settings    →  business profile, receipt template, tax toggle
  Team        →  invite a cashier / manager
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
}

main()
  .catch((err) => {
    console.error("\n✘ Demo seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

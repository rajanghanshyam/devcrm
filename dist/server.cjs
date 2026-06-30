var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server.ts
var server_exports = {};
__export(server_exports, {
  default: () => server_default
});
module.exports = __toCommonJS(server_exports);
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_nodemailer = __toESM(require("nodemailer"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
var import_genai = require("@google/genai");

// src/db.ts
var import_client = __toESM(require("@prisma/client"), 1);
var import_adapter_pg = require("@prisma/adapter-pg");
var import_pg = __toESM(require("pg"), 1);
var { PrismaClient } = import_client.default;
var _prisma = null;
function getPrismaInstance() {
  if (!_prisma) {
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.PRISMA_DATABASE_URL || "postgres://39fa8947a0a7c93fc3ca5f596079dd20d678ac1cb93abbe4679e3e15ca18e1ec:sk_lGohgpWPo3Urls8VzjTok@db.prisma.io:5432/postgres?sslmode=require";
    if (!connectionString) {
      console.warn("WARNING: DATABASE_URL, POSTGRES_URL, or PRISMA_DATABASE_URL is not defined. Initializing Prisma client without adapter.");
      _prisma = new PrismaClient({
        log: ["error", "warn"]
      });
    } else {
      const pool = new import_pg.default.Pool({ connectionString });
      const adapter = new import_adapter_pg.PrismaPg(pool);
      _prisma = new PrismaClient({
        adapter,
        log: ["error", "warn"]
      });
    }
  }
  return _prisma;
}
var globalForPrisma = globalThis;
var prisma = new Proxy({}, {
  get(target, prop, receiver) {
    const instance = globalForPrisma.prisma || getPrismaInstance();
    if (process.env.NODE_ENV !== "production" && !globalForPrisma.prisma) {
      globalForPrisma.prisma = instance;
    }
    const value = Reflect.get(instance, prop, receiver);
    if (typeof value === "function") {
      return value.bind(instance);
    }
    return value;
  }
});

// src/schemaCheck.ts
async function performSchemaMigrationCheck() {
  console.log("Performing schema migration check...");
  try {
    const expectedTables = [
      "company_profiles",
      "customers",
      "products",
      "terms_presets",
      "subscription_policies",
      "quotations",
      "quotation_items",
      "invoices",
      "invoice_items",
      "delivery_challans",
      "delivery_challan_items",
      "leads",
      "subscriptions",
      "reminders",
      "inventory_items",
      "inventory_logs",
      "user_profiles",
      "app_data"
    ];
    const result = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    const existingTables = result.map((r) => r.table_name);
    const missingTables = expectedTables.filter((t) => !existingTables.includes(t));
    if (missingTables.length > 0) {
      console.warn(`[Schema Check] Missing tables found: ${missingTables.join(", ")}.`);
      console.warn("Please run prisma migrate dev or prisma db push to sync the schema.");
    } else {
      console.log("[Schema Check] All expected tables exist. Schema is up to date.");
    }
  } catch (error) {
    console.error("[Schema Check] Failed to check schema:", error);
  }
}

// src/dbHelper.ts
function parseDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}
async function saveToPrisma(payload) {
  await prisma.$transaction(async (tx) => {
    const isFullSave = payload.company_profiles !== void 0 && payload.customers !== void 0 && payload.products !== void 0 && payload.inventory !== void 0 && payload.quotations !== void 0;
    if (isFullSave) {
      console.log("Full save detected. Wiping existing records first to ensure consistency.");
      await tx.inventoryLogs.deleteMany();
      await tx.inventoryItems.deleteMany();
      await tx.quotationItems.deleteMany();
      await tx.invoiceItems.deleteMany();
      await tx.deliveryChallanItems.deleteMany();
      await tx.reminders.deleteMany();
      await tx.subscriptions.deleteMany();
      await tx.leads.deleteMany();
      await tx.deliveryChallans.deleteMany();
      await tx.invoices.deleteMany();
      await tx.quotations.deleteMany();
      await tx.products.deleteMany();
      await tx.customers.deleteMany();
      await tx.subscriptionPolicies.deleteMany();
      await tx.termsPresets.deleteMany();
      await tx.companyProfiles.deleteMany();
    }
    const companyIds = /* @__PURE__ */ new Set();
    const termsPresetIds = /* @__PURE__ */ new Set();
    const customerIds = /* @__PURE__ */ new Set();
    const productIds = /* @__PURE__ */ new Set();
    const productSkus = /* @__PURE__ */ new Set();
    const inventorySkus = /* @__PURE__ */ new Set();
    const quotationIds = /* @__PURE__ */ new Set();
    const quotationNos = /* @__PURE__ */ new Set();
    const subscriptionIds = /* @__PURE__ */ new Set();
    if (!isFullSave) {
      const dbCompanies = await tx.companyProfiles.findMany({ select: { id: true } });
      dbCompanies.forEach((c) => companyIds.add(c.id));
      const dbTerms = await tx.termsPresets.findMany({ select: { id: true } });
      dbTerms.forEach((t) => termsPresetIds.add(t.id));
      const dbCustomers = await tx.customers.findMany({ select: { id: true } });
      dbCustomers.forEach((c) => customerIds.add(c.id));
      const dbProducts = await tx.products.findMany({ select: { id: true, sku: true } });
      dbProducts.forEach((p) => {
        productIds.add(p.id);
        if (p.sku) productSkus.add(p.sku.toUpperCase().trim());
      });
      const dbQuotations = await tx.quotations.findMany({ select: { id: true, quotationNo: true } });
      dbQuotations.forEach((q) => {
        quotationIds.add(q.id);
        if (q.quotationNo) quotationNos.add(q.quotationNo);
      });
      const dbSubscriptions = await tx.subscriptions.findMany({ select: { id: true } });
      dbSubscriptions.forEach((s) => subscriptionIds.add(s.id));
    }
    if (payload.company_profiles !== void 0) {
      const incomingIds = payload.company_profiles.map((cp) => cp.id);
      await tx.termsPresets.deleteMany({
        where: { companyProfileId: { in: incomingIds } }
      });
      for (const cp of payload.company_profiles || []) {
        companyIds.add(cp.id);
        await tx.companyProfiles.upsert({
          where: { id: cp.id },
          update: {
            name: cp.name,
            email: cp.email || "",
            phone: cp.phone,
            address: cp.address,
            gstin: cp.gstin,
            pan: cp.pan,
            state: cp.state,
            bankName: cp.bankName,
            bankBranch: cp.bankBranch,
            accountNo: cp.accountNo,
            ifsc: cp.ifsc,
            headerImage: cp.headerImage,
            footerImage: cp.footerImage,
            signatureImage: cp.signatureImage,
            template: cp.template,
            quotationPrefix: cp.quotationPrefix,
            invoicePrefix: cp.invoicePrefix,
            challanPrefix: cp.challanPrefix,
            nextQuotationNumber: cp.nextQuotationNumber || 1,
            nextInvoiceNumber: cp.nextInvoiceNumber || 1,
            nextChallanNumber: cp.nextChallanNumber || 1
          },
          create: {
            id: cp.id,
            name: cp.name,
            email: cp.email || "",
            phone: cp.phone,
            address: cp.address,
            gstin: cp.gstin,
            pan: cp.pan,
            state: cp.state,
            bankName: cp.bankName,
            bankBranch: cp.bankBranch,
            accountNo: cp.accountNo,
            ifsc: cp.ifsc,
            headerImage: cp.headerImage,
            footerImage: cp.footerImage,
            signatureImage: cp.signatureImage,
            template: cp.template,
            quotationPrefix: cp.quotationPrefix,
            invoicePrefix: cp.invoicePrefix,
            challanPrefix: cp.challanPrefix,
            nextQuotationNumber: cp.nextQuotationNumber || 1,
            nextInvoiceNumber: cp.nextInvoiceNumber || 1,
            nextChallanNumber: cp.nextChallanNumber || 1
          }
        });
        for (const tp of cp.termsPresets || []) {
          termsPresetIds.add(tp.id);
          await tx.termsPresets.upsert({
            where: { id: tp.id },
            update: {
              companyProfileId: cp.id,
              title: tp.title,
              content: tp.content
            },
            create: {
              id: tp.id,
              companyProfileId: cp.id,
              title: tp.title,
              content: tp.content
            }
          });
        }
      }
      const existing = await tx.companyProfiles.findMany({ select: { id: true } });
      for (const ep of existing) {
        if (!incomingIds.includes(ep.id)) {
          try {
            await tx.companyProfiles.delete({ where: { id: ep.id } });
          } catch (e) {
            console.warn(`Could not delete unused company profile ${ep.id}:`, e);
          }
        }
      }
    }
    if (payload.customers !== void 0) {
      const incomingIds = payload.customers.map((c) => c.id);
      for (const cust of payload.customers || []) {
        customerIds.add(cust.id);
        await tx.customers.upsert({
          where: { id: cust.id },
          update: {
            name: cust.name,
            company: cust.company,
            email: cust.email,
            phone: cust.phone,
            gstin: cust.gstin,
            state: cust.state || "Maharashtra",
            billingAddress: cust.billingAddress,
            shippingAddress: cust.shippingAddress
          },
          create: {
            id: cust.id,
            name: cust.name,
            company: cust.company,
            email: cust.email,
            phone: cust.phone,
            gstin: cust.gstin,
            state: cust.state || "Maharashtra",
            billingAddress: cust.billingAddress,
            shippingAddress: cust.shippingAddress
          }
        });
      }
      const existing = await tx.customers.findMany({ select: { id: true } });
      for (const ec of existing) {
        if (!incomingIds.includes(ec.id)) {
          try {
            await tx.customers.delete({ where: { id: ec.id } });
          } catch (e) {
            console.warn(`Could not delete customer ${ec.id} (might be referenced):`, e);
          }
        }
      }
    }
    if (payload.products !== void 0) {
      const currentProductsMap = /* @__PURE__ */ new Map();
      const dbProducts = await tx.products.findMany({ select: { id: true, sku: true } });
      dbProducts.forEach((p) => {
        if (p.sku) currentProductsMap.set(p.sku.toUpperCase().trim(), p.id);
      });
      const incomingIds = payload.products.map((p) => p.id);
      for (const prod of payload.products || []) {
        productIds.add(prod.id);
        let prodSku = prod.sku ? prod.sku.toUpperCase().trim() : "";
        if (!prodSku) {
          prodSku = `SKU_${prod.id.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`;
        }
        let finalProdSku = prodSku;
        let counter = 1;
        while (true) {
          const owningId = currentProductsMap.get(finalProdSku);
          if (!owningId || owningId === prod.id) {
            break;
          }
          finalProdSku = `${prodSku}_${counter}`;
          counter++;
        }
        currentProductsMap.set(finalProdSku, prod.id);
        await tx.products.upsert({
          where: { id: prod.id },
          update: {
            name: prod.name || "Unnamed Product",
            sku: finalProdSku,
            rate: prod.rate || 0,
            gstRate: prod.gstRate || 18,
            hsnCode: prod.hsnCode,
            description: prod.description,
            itemType: prod.itemType,
            mrp: prod.mrp,
            lastPurchasePrice: prod.lastPurchasePrice,
            sellPrice: prod.sellPrice
          },
          create: {
            id: prod.id,
            name: prod.name || "Unnamed Product",
            sku: finalProdSku,
            rate: prod.rate || 0,
            gstRate: prod.gstRate || 18,
            hsnCode: prod.hsnCode,
            description: prod.description,
            itemType: prod.itemType,
            mrp: prod.mrp,
            lastPurchasePrice: prod.lastPurchasePrice,
            sellPrice: prod.sellPrice
          }
        });
      }
      const existing = await tx.products.findMany({ select: { id: true } });
      for (const ep of existing) {
        if (!incomingIds.includes(ep.id)) {
          try {
            await tx.products.delete({ where: { id: ep.id } });
          } catch (e) {
            console.warn(`Could not delete product ${ep.id} (might be referenced):`, e);
          }
        }
      }
    }
    if (payload.inventory !== void 0) {
      const currentProductsMap = /* @__PURE__ */ new Map();
      const dbProducts = await tx.products.findMany({ select: { id: true, sku: true } });
      dbProducts.forEach((p) => {
        if (p.sku) currentProductsMap.set(p.sku.toUpperCase().trim(), p.id);
      });
      const currentInventoryMap = /* @__PURE__ */ new Map();
      const dbInventory = await tx.inventoryItems.findMany({ select: { id: true, sku: true } });
      dbInventory.forEach((inv) => {
        if (inv.sku) currentInventoryMap.set(inv.sku.toUpperCase().trim(), inv.id);
      });
      const incomingIds = payload.inventory.map((inv) => inv.id);
      for (const inv of payload.inventory || []) {
        let invSku = inv.sku ? inv.sku.toUpperCase().trim() : "";
        if (!invSku) {
          invSku = `SKU_INV_${inv.id.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`;
        }
        let finalInvSku = invSku;
        let counter = 1;
        while (true) {
          const owningId = currentInventoryMap.get(finalInvSku);
          if (!owningId || owningId === inv.id) {
            break;
          }
          finalInvSku = `${invSku}_${counter}`;
          counter++;
        }
        currentInventoryMap.set(finalInvSku, inv.id);
        if (!currentProductsMap.has(finalInvSku)) {
          const placeholderProdId = `prod_placeholder_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
          await tx.products.create({
            data: {
              id: placeholderProdId,
              name: inv.productName || `Product for SKU ${finalInvSku}`,
              sku: finalInvSku,
              rate: inv.unitPrice || 0,
              gstRate: 18,
              description: "Automatically created placeholder product for inventory item"
            }
          });
          currentProductsMap.set(finalInvSku, placeholderProdId);
          productIds.add(placeholderProdId);
        }
        await tx.inventoryItems.upsert({
          where: { id: inv.id },
          update: {
            sku: finalInvSku,
            productName: inv.productName || "Product",
            category: inv.category,
            quantity: inv.quantity || 0,
            minQuantity: inv.minQuantity || 0,
            purchaseFrom: inv.purchaseFrom,
            unitPrice: inv.unitPrice || 0,
            latestPurchasePrice: inv.latestPurchasePrice,
            lastUpdated: parseDate(inv.lastUpdated) || /* @__PURE__ */ new Date()
          },
          create: {
            id: inv.id,
            sku: finalInvSku,
            productName: inv.productName || "Product",
            category: inv.category,
            quantity: inv.quantity || 0,
            minQuantity: inv.minQuantity || 0,
            purchaseFrom: inv.purchaseFrom,
            unitPrice: inv.unitPrice || 0,
            latestPurchasePrice: inv.latestPurchasePrice,
            lastUpdated: parseDate(inv.lastUpdated) || /* @__PURE__ */ new Date()
          }
        });
        await tx.inventoryLogs.deleteMany({
          where: { inventoryItemId: inv.id }
        });
        for (const log of inv.logs || []) {
          await tx.inventoryLogs.create({
            data: {
              id: log.id,
              inventoryItemId: inv.id,
              date: parseDate(log.date) || /* @__PURE__ */ new Date(),
              type: log.type,
              quantity: log.quantity || 0,
              reason: log.reason,
              prevQty: log.prevQty || 0,
              newQty: log.newQty || 0,
              supplierName: log.supplierName,
              customerName: log.customerName
            }
          });
        }
      }
      const existing = await tx.inventoryItems.findMany({ select: { id: true } });
      for (const ei of existing) {
        if (!incomingIds.includes(ei.id)) {
          try {
            await tx.inventoryLogs.deleteMany({ where: { inventoryItemId: ei.id } });
            await tx.inventoryItems.delete({ where: { id: ei.id } });
          } catch (e) {
            console.warn(`Could not delete inventory item ${ei.id}:`, e);
          }
        }
      }
    }
    if (payload.quotations !== void 0) {
      const incomingIds = payload.quotations.map((q) => q.id);
      await tx.quotationItems.deleteMany({
        where: { quotationId: { in: incomingIds } }
      });
      for (const qt of payload.quotations || []) {
        quotationIds.add(qt.id);
        if (qt.quotationNo) {
          quotationNos.add(qt.quotationNo);
        }
        let qCustId = qt.customerId;
        if (!customerIds.has(qCustId)) {
          await tx.customers.create({
            data: {
              id: qCustId,
              name: "Placeholder Customer",
              state: "Maharashtra"
            }
          });
          customerIds.add(qCustId);
        }
        await tx.quotations.upsert({
          where: { id: qt.id },
          update: {
            quotationNo: qt.quotationNo,
            date: parseDate(qt.date) || /* @__PURE__ */ new Date(),
            validUntil: parseDate(qt.validUntil),
            customerId: qCustId,
            subject: qt.subject,
            subtotal: qt.subtotal || 0,
            discountTotal: qt.discountTotal || 0,
            cgstTotal: qt.cgstTotal || 0,
            sgstTotal: qt.sgstTotal || 0,
            igstTotal: qt.igstTotal || 0,
            grandTotal: qt.grandTotal || 0,
            status: qt.status,
            terms: qt.terms,
            companyId: qt.companyId && companyIds.has(qt.companyId) ? qt.companyId : null,
            termsPresetId: qt.termsPresetId && termsPresetIds.has(qt.termsPresetId) ? qt.termsPresetId : null,
            freight: qt.freight,
            additionalDiscount: qt.additionalDiscount,
            customerSignature: qt.customerSignature,
            customerSignedAt: parseDate(qt.customerSignedAt),
            revisionOfId: null,
            // set to null on update, resolved later
            originalQuoteId: null,
            // set to null on update, resolved later
            revisionNumber: qt.revisionNumber
          },
          create: {
            id: qt.id,
            quotationNo: qt.quotationNo,
            date: parseDate(qt.date) || /* @__PURE__ */ new Date(),
            validUntil: parseDate(qt.validUntil),
            customerId: qCustId,
            subject: qt.subject,
            subtotal: qt.subtotal || 0,
            discountTotal: qt.discountTotal || 0,
            cgstTotal: qt.cgstTotal || 0,
            sgstTotal: qt.sgstTotal || 0,
            igstTotal: qt.igstTotal || 0,
            grandTotal: qt.grandTotal || 0,
            status: qt.status,
            terms: qt.terms,
            companyId: qt.companyId && companyIds.has(qt.companyId) ? qt.companyId : null,
            termsPresetId: qt.termsPresetId && termsPresetIds.has(qt.termsPresetId) ? qt.termsPresetId : null,
            freight: qt.freight,
            additionalDiscount: qt.additionalDiscount,
            customerSignature: qt.customerSignature,
            customerSignedAt: parseDate(qt.customerSignedAt),
            revisionOfId: null,
            originalQuoteId: null,
            revisionNumber: qt.revisionNumber
          }
        });
        for (const item of qt.items || []) {
          await tx.quotationItems.create({
            data: {
              quotationId: qt.id,
              productId: item.productId && productIds.has(item.productId) ? item.productId : null,
              productName: item.productName || "Product",
              description: item.description,
              hsnCode: item.hsnCode,
              quantity: item.quantity || 1,
              rate: item.rate || 0,
              discountPercent: item.discountPercent || 0,
              gstPercent: item.gstPercent || 18
            }
          });
        }
      }
      for (const qt of payload.quotations || []) {
        if (qt.revisionOfId || qt.originalQuoteId) {
          await tx.quotations.update({
            where: { id: qt.id },
            data: {
              revisionOfId: qt.revisionOfId && quotationIds.has(qt.revisionOfId) ? qt.revisionOfId : null,
              originalQuoteId: qt.originalQuoteId && quotationIds.has(qt.originalQuoteId) ? qt.originalQuoteId : null
            }
          });
        }
      }
      const existing = await tx.quotations.findMany({ select: { id: true } });
      for (const eq of existing) {
        if (!incomingIds.includes(eq.id)) {
          try {
            await tx.quotationItems.deleteMany({ where: { quotationId: eq.id } });
            await tx.quotations.delete({ where: { id: eq.id } });
          } catch (e) {
            console.warn(`Could not delete quotation ${eq.id}:`, e);
          }
        }
      }
    }
    if (payload.proforma_invoices !== void 0) {
      const incomingIds = payload.proforma_invoices.map((i) => i.id);
      await tx.invoiceItems.deleteMany({
        where: { invoiceId: { in: incomingIds } }
      });
      for (const inv of payload.proforma_invoices || []) {
        let iCustId = inv.customerId;
        if (!customerIds.has(iCustId)) {
          await tx.customers.create({
            data: {
              id: iCustId,
              name: "Placeholder Customer",
              state: "Maharashtra"
            }
          });
          customerIds.add(iCustId);
        }
        await tx.invoices.upsert({
          where: { id: inv.id },
          update: {
            invoiceNo: inv.invoiceNo,
            quotationNo: inv.quotationNo && quotationNos.has(inv.quotationNo) ? inv.quotationNo : null,
            date: parseDate(inv.date) || /* @__PURE__ */ new Date(),
            dueDate: parseDate(inv.dueDate),
            customerId: iCustId,
            subject: inv.subject,
            subtotal: inv.subtotal || 0,
            discountTotal: inv.discountTotal || 0,
            cgstTotal: inv.cgstTotal || 0,
            sgstTotal: inv.sgstTotal || 0,
            igstTotal: inv.igstTotal || 0,
            grandTotal: inv.grandTotal || 0,
            status: inv.status,
            terms: inv.terms,
            companyId: inv.companyId && companyIds.has(inv.companyId) ? inv.companyId : null,
            termsPresetId: inv.termsPresetId && termsPresetIds.has(inv.termsPresetId) ? inv.termsPresetId : null,
            freight: inv.freight,
            additionalDiscount: inv.additionalDiscount,
            customerSignature: inv.customerSignature,
            customerSignedAt: parseDate(inv.customerSignedAt)
          },
          create: {
            id: inv.id,
            invoiceNo: inv.invoiceNo,
            quotationNo: inv.quotationNo && quotationNos.has(inv.quotationNo) ? inv.quotationNo : null,
            date: parseDate(inv.date) || /* @__PURE__ */ new Date(),
            dueDate: parseDate(inv.dueDate),
            customerId: iCustId,
            subject: inv.subject,
            subtotal: inv.subtotal || 0,
            discountTotal: inv.discountTotal || 0,
            cgstTotal: inv.cgstTotal || 0,
            sgstTotal: inv.sgstTotal || 0,
            igstTotal: inv.igstTotal || 0,
            grandTotal: inv.grandTotal || 0,
            status: inv.status,
            terms: inv.terms,
            companyId: inv.companyId && companyIds.has(inv.companyId) ? inv.companyId : null,
            termsPresetId: inv.termsPresetId && termsPresetIds.has(inv.termsPresetId) ? inv.termsPresetId : null,
            freight: inv.freight,
            additionalDiscount: inv.additionalDiscount,
            customerSignature: inv.customerSignature,
            customerSignedAt: parseDate(inv.customerSignedAt)
          }
        });
        for (const item of inv.items || []) {
          await tx.invoiceItems.create({
            data: {
              invoiceId: inv.id,
              productId: item.productId && productIds.has(item.productId) ? item.productId : null,
              productName: item.productName || "Product",
              description: item.description,
              hsnCode: item.hsnCode,
              quantity: item.quantity || 1,
              rate: item.rate || 0,
              discountPercent: item.discountPercent || 0,
              gstPercent: item.gstPercent || 18
            }
          });
        }
      }
      const existing = await tx.invoices.findMany({ select: { id: true } });
      for (const ei of existing) {
        if (!incomingIds.includes(ei.id)) {
          try {
            await tx.invoiceItems.deleteMany({ where: { invoiceId: ei.id } });
            await tx.invoices.delete({ where: { id: ei.id } });
          } catch (e) {
            console.warn(`Could not delete invoice ${ei.id}:`, e);
          }
        }
      }
    }
    if (payload.challans !== void 0) {
      const incomingIds = payload.challans.map((ch) => ch.id);
      await tx.deliveryChallanItems.deleteMany({
        where: { deliveryChallanId: { in: incomingIds } }
      });
      for (const ch of payload.challans || []) {
        let chCustId = ch.customerId;
        if (!customerIds.has(chCustId)) {
          await tx.customers.create({
            data: {
              id: chCustId,
              name: "Placeholder Customer",
              state: "Maharashtra"
            }
          });
          customerIds.add(chCustId);
        }
        await tx.deliveryChallans.upsert({
          where: { id: ch.id },
          update: {
            challanNo: ch.challanNo,
            date: parseDate(ch.date) || /* @__PURE__ */ new Date(),
            customerId: chCustId,
            vehicleNo: ch.vehicleNo,
            transporter: ch.transporter,
            lrNumber: ch.lrNumber,
            dispatchAddress: ch.dispatchAddress,
            status: ch.status,
            notes: ch.notes,
            companyId: ch.companyId && companyIds.has(ch.companyId) ? ch.companyId : null
          },
          create: {
            id: ch.id,
            challanNo: ch.challanNo,
            date: parseDate(ch.date) || /* @__PURE__ */ new Date(),
            customerId: chCustId,
            vehicleNo: ch.vehicleNo,
            transporter: ch.transporter,
            lrNumber: ch.lrNumber,
            dispatchAddress: ch.dispatchAddress,
            status: ch.status,
            notes: ch.notes,
            companyId: ch.companyId && companyIds.has(ch.companyId) ? ch.companyId : null
          }
        });
        for (const item of ch.items || []) {
          await tx.deliveryChallanItems.create({
            data: {
              deliveryChallanId: ch.id,
              productName: item.productName || "Product",
              quantity: item.quantity || 1,
              hsnCode: item.hsnCode,
              description: item.description
            }
          });
        }
      }
      const existing = await tx.deliveryChallans.findMany({ select: { id: true } });
      for (const ec of existing) {
        if (!incomingIds.includes(ec.id)) {
          try {
            await tx.deliveryChallanItems.deleteMany({ where: { deliveryChallanId: ec.id } });
            await tx.deliveryChallans.delete({ where: { id: ec.id } });
          } catch (e) {
            console.warn(`Could not delete delivery challan ${ec.id}:`, e);
          }
        }
      }
    }
    if (payload.leads !== void 0) {
      const incomingIds = payload.leads.map((ld) => ld.id);
      for (const ld of payload.leads || []) {
        await tx.leads.upsert({
          where: { id: ld.id },
          update: {
            customerId: ld.customerId && customerIds.has(ld.customerId) ? ld.customerId : null,
            name: ld.name,
            company: ld.company,
            email: ld.email,
            phone: ld.phone,
            value: ld.value || 0,
            status: ld.status,
            source: ld.source,
            notes: ld.notes,
            date: parseDate(ld.date),
            conversionStatus: ld.conversionStatus
          },
          create: {
            id: ld.id,
            customerId: ld.customerId && customerIds.has(ld.customerId) ? ld.customerId : null,
            name: ld.name,
            company: ld.company,
            email: ld.email,
            phone: ld.phone,
            value: ld.value || 0,
            status: ld.status,
            source: ld.source,
            notes: ld.notes,
            date: parseDate(ld.date),
            conversionStatus: ld.conversionStatus
          }
        });
      }
      const existing = await tx.leads.findMany({ select: { id: true } });
      for (const el of existing) {
        if (!incomingIds.includes(el.id)) {
          try {
            await tx.leads.delete({ where: { id: el.id } });
          } catch (e) {
            console.warn(`Could not delete lead ${el.id}:`, e);
          }
        }
      }
    }
    if (payload.subscriptions !== void 0) {
      const incomingIds = payload.subscriptions.map((sub) => sub.id);
      for (const sub of payload.subscriptions || []) {
        subscriptionIds.add(sub.id);
        let sCustId = sub.customerId;
        if (!customerIds.has(sCustId)) {
          await tx.customers.create({
            data: {
              id: sCustId,
              name: "Placeholder Customer",
              state: "Maharashtra"
            }
          });
          customerIds.add(sCustId);
        }
        await tx.subscriptions.upsert({
          where: { id: sub.id },
          update: {
            customerId: sCustId,
            serviceName: sub.serviceName,
            amount: sub.amount || 0,
            billingCycle: sub.billingCycle,
            startDate: parseDate(sub.startDate) || /* @__PURE__ */ new Date(),
            nextRenewalDate: parseDate(sub.nextRenewalDate) || /* @__PURE__ */ new Date(),
            status: sub.status,
            description: sub.description
          },
          create: {
            id: sub.id,
            customerId: sCustId,
            serviceName: sub.serviceName,
            amount: sub.amount || 0,
            billingCycle: sub.billingCycle,
            startDate: parseDate(sub.startDate) || /* @__PURE__ */ new Date(),
            nextRenewalDate: parseDate(sub.nextRenewalDate) || /* @__PURE__ */ new Date(),
            status: sub.status,
            description: sub.description
          }
        });
      }
      const existing = await tx.subscriptions.findMany({ select: { id: true } });
      for (const es of existing) {
        if (!incomingIds.includes(es.id)) {
          try {
            await tx.subscriptions.delete({ where: { id: es.id } });
          } catch (e) {
            console.warn(`Could not delete subscription ${es.id}:`, e);
          }
        }
      }
    }
    if (payload.reminders !== void 0) {
      const incomingIds = payload.reminders.map((rem) => rem.id);
      for (const rem of payload.reminders || []) {
        await tx.reminders.upsert({
          where: { id: rem.id },
          update: {
            title: rem.title,
            description: rem.description,
            dueDate: parseDate(rem.dueDate) || /* @__PURE__ */ new Date(),
            status: rem.status,
            priority: rem.priority,
            relatedTo: rem.relatedTo,
            subscriptionId: rem.subscriptionId && subscriptionIds.has(rem.subscriptionId) ? rem.subscriptionId : null,
            customerId: rem.customerId && customerIds.has(rem.customerId) ? rem.customerId : null
          },
          create: {
            id: rem.id,
            title: rem.title,
            description: rem.description,
            dueDate: parseDate(rem.dueDate) || /* @__PURE__ */ new Date(),
            status: rem.status,
            priority: rem.priority,
            relatedTo: rem.relatedTo,
            subscriptionId: rem.subscriptionId && subscriptionIds.has(rem.subscriptionId) ? rem.subscriptionId : null,
            customerId: rem.customerId && customerIds.has(rem.customerId) ? rem.customerId : null
          }
        });
      }
      const existing = await tx.reminders.findMany({ select: { id: true } });
      for (const er of existing) {
        if (!incomingIds.includes(er.id)) {
          try {
            await tx.reminders.delete({ where: { id: er.id } });
          } catch (e) {
            console.warn(`Could not delete reminder ${er.id}:`, e);
          }
        }
      }
    }
  }, {
    timeout: 6e4
    // 60 seconds for bulk transaction
  });
}
async function getFromPrisma() {
  const result = {};
  result.company_profiles = await prisma.companyProfiles.findMany({ include: { termsPresets: true } });
  result.customers = await prisma.customers.findMany();
  result.products = await prisma.products.findMany();
  const rawQuotations = await prisma.quotations.findMany({ include: { quotationItems: true } });
  result.quotations = rawQuotations.map((q) => ({
    ...q,
    items: q.quotationItems
  }));
  const rawInvoices = await prisma.invoices.findMany({ include: { invoiceItems: true } });
  result.proforma_invoices = rawInvoices.map((i) => ({
    ...i,
    items: i.invoiceItems
  }));
  const rawChallans = await prisma.deliveryChallans.findMany({ include: { deliveryChallanItems: true } });
  result.challans = rawChallans.map((c) => ({
    ...c,
    items: c.deliveryChallanItems
  }));
  result.leads = await prisma.leads.findMany();
  result.subscriptions = await prisma.subscriptions.findMany();
  result.reminders = await prisma.reminders.findMany();
  const rawInventory = await prisma.inventoryItems.findMany({ include: { inventoryLogs: true } });
  result.inventory = rawInventory.map((inv) => ({
    ...inv,
    logs: inv.inventoryLogs
  }));
  return JSON.parse(JSON.stringify(result));
}

// server.ts
import_dotenv.default.config();
var aiInstance = null;
function getAI() {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("WARNING: GEMINI_API_KEY is not defined. Using offline/fallback Indian GST data synthesis.");
      return null;
    }
    aiInstance = new import_genai.GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return aiInstance;
}
var gstStateCodes = {
  "01": "Jammu and Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Punjab",
  // UT Chandigarh
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chhattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "25": "Gujarat",
  // Daman & Diu
  "26": "Gujarat",
  // Dadra & Nagar Haveli
  "27": "Maharashtra",
  "28": "Andhra Pradesh",
  "29": "Karnataka",
  "30": "Goa",
  "31": "Kerala",
  // Lakshadweep
  "32": "Kerala",
  "33": "Tamil Nadu",
  "34": "Tamil Nadu",
  // Puducherry
  "35": "Andaman and Nicobar Islands",
  "36": "Telangana",
  "37": "Andhra Pradesh",
  "38": "Ladakh"
};
var app = (0, import_express.default)();
var PORT = 3e3;
var isInitialized = false;
var initPromise = null;
async function ensureInitialized() {
  if (isInitialized) return;
  if (!initPromise) {
    initPromise = (async () => {
      try {
        await performSchemaMigrationCheck();
        await seedDefaultUsers();
        isInitialized = true;
      } catch (e) {
        console.error("Serverless startup seeding failed:", e);
      }
    })();
  }
  await initPromise;
}
app.use(async (req, res, next) => {
  if (process.env.VERCEL) {
    await ensureInitialized();
  }
  next();
});
app.use(import_express.default.json({ limit: "50mb" }));
app.use(import_express.default.urlencoded({ extended: true, limit: "50mb" }));
app.post("/api/db/save", async (req, res) => {
  const payload = req.body;
  try {
    console.log("Saving massive JSON payload to Prisma models...");
    await saveToPrisma(payload);
    res.json({ success: true, message: "Database saved to Prisma models successfully!" });
  } catch (error) {
    console.error("CRITICAL error in Prisma save endpoint:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});
app.post("/api/save-entry", async (req, res) => {
  const { model, data } = req.body;
  if (!model || !data || !data.id) {
    return res.status(400).json({ success: false, error: "Model, data, and data.id are required" });
  }
  try {
    console.log(`Direct entry save requested: model=${model}, id=${data.id}`);
    if (model === "company_profiles") {
      await prisma.termsPresets.deleteMany({ where: { companyProfileId: data.id } });
      await prisma.companyProfiles.upsert({
        where: { id: data.id },
        update: {
          name: data.name,
          email: data.email || "",
          phone: data.phone,
          address: data.address,
          gstin: data.gstin,
          pan: data.pan,
          state: data.state,
          bankName: data.bankName,
          bankBranch: data.bankBranch,
          accountNo: data.accountNo,
          ifsc: data.ifsc,
          headerImage: data.headerImage,
          footerImage: data.footerImage,
          signatureImage: data.signatureImage,
          template: data.template,
          quotationPrefix: data.quotationPrefix,
          invoicePrefix: data.invoicePrefix,
          challanPrefix: data.challanPrefix,
          nextQuotationNumber: data.nextQuotationNumber || 1,
          nextInvoiceNumber: data.nextInvoiceNumber || 1,
          nextChallanNumber: data.nextChallanNumber || 1
        },
        create: {
          id: data.id,
          name: data.name,
          email: data.email || "",
          phone: data.phone,
          address: data.address,
          gstin: data.gstin,
          pan: data.pan,
          state: data.state,
          bankName: data.bankName,
          bankBranch: data.bankBranch,
          accountNo: data.accountNo,
          ifsc: data.ifsc,
          headerImage: data.headerImage,
          footerImage: data.footerImage,
          signatureImage: data.signatureImage,
          template: data.template,
          quotationPrefix: data.quotationPrefix,
          invoicePrefix: data.invoicePrefix,
          challanPrefix: data.challanPrefix,
          nextQuotationNumber: data.nextQuotationNumber || 1,
          nextInvoiceNumber: data.nextInvoiceNumber || 1,
          nextChallanNumber: data.nextChallanNumber || 1
        }
      });
      if (data.termsPresets && Array.isArray(data.termsPresets)) {
        for (const tp of data.termsPresets) {
          await prisma.termsPresets.upsert({
            where: { id: tp.id },
            update: {
              companyProfileId: data.id,
              title: tp.title,
              content: tp.content
            },
            create: {
              id: tp.id,
              companyProfileId: data.id,
              title: tp.title,
              content: tp.content
            }
          });
        }
      }
    } else if (model === "customers") {
      await prisma.customers.upsert({
        where: { id: data.id },
        update: {
          name: data.name,
          company: data.company,
          email: data.email,
          phone: data.phone,
          gstin: data.gstin,
          state: data.state || "Maharashtra",
          billingAddress: data.billingAddress,
          shippingAddress: data.shippingAddress
        },
        create: {
          id: data.id,
          name: data.name,
          company: data.company,
          email: data.email,
          phone: data.phone,
          gstin: data.gstin,
          state: data.state || "Maharashtra",
          billingAddress: data.billingAddress,
          shippingAddress: data.shippingAddress
        }
      });
    } else if (model === "products") {
      await prisma.products.upsert({
        where: { id: data.id },
        update: {
          name: data.name || "Unnamed Product",
          sku: data.sku,
          rate: data.rate || 0,
          gstRate: data.gstRate || 18,
          hsnCode: data.hsnCode,
          description: data.description,
          itemType: data.itemType,
          mrp: data.mrp,
          lastPurchasePrice: data.lastPurchasePrice,
          sellPrice: data.sellPrice
        },
        create: {
          id: data.id,
          name: data.name || "Unnamed Product",
          sku: data.sku,
          rate: data.rate || 0,
          gstRate: data.gstRate || 18,
          hsnCode: data.hsnCode,
          description: data.description,
          itemType: data.itemType,
          mrp: data.mrp,
          lastPurchasePrice: data.lastPurchasePrice,
          sellPrice: data.sellPrice
        }
      });
    } else if (model === "quotations") {
      await prisma.quotationItems.deleteMany({ where: { quotationId: data.id } });
      if (data.customerId) {
        const custExists = await prisma.customers.findUnique({ where: { id: data.customerId } });
        if (!custExists) {
          await prisma.customers.create({
            data: { id: data.customerId, name: "Placeholder Customer", state: "Maharashtra" }
          });
        }
      }
      await prisma.quotations.upsert({
        where: { id: data.id },
        update: {
          quotationNo: data.quotationNo,
          date: data.date ? new Date(data.date) : /* @__PURE__ */ new Date(),
          validUntil: data.validUntil ? new Date(data.validUntil) : null,
          customerId: data.customerId,
          subject: data.subject,
          subtotal: data.subtotal || 0,
          discountTotal: data.discountTotal || 0,
          cgstTotal: data.cgstTotal || 0,
          sgstTotal: data.sgstTotal || 0,
          igstTotal: data.igstTotal || 0,
          grandTotal: data.grandTotal || 0,
          status: data.status,
          terms: data.terms,
          companyId: data.companyId,
          termsPresetId: data.termsPresetId,
          freight: data.freight,
          additionalDiscount: data.additionalDiscount,
          customerSignature: data.customerSignature,
          customerSignedAt: data.customerSignedAt ? new Date(data.customerSignedAt) : null,
          revisionNumber: data.revisionNumber
        },
        create: {
          id: data.id,
          quotationNo: data.quotationNo,
          date: data.date ? new Date(data.date) : /* @__PURE__ */ new Date(),
          validUntil: data.validUntil ? new Date(data.validUntil) : null,
          customerId: data.customerId,
          subject: data.subject,
          subtotal: data.subtotal || 0,
          discountTotal: data.discountTotal || 0,
          cgstTotal: data.cgstTotal || 0,
          sgstTotal: data.sgstTotal || 0,
          igstTotal: data.igstTotal || 0,
          grandTotal: data.grandTotal || 0,
          status: data.status,
          terms: data.terms,
          companyId: data.companyId,
          termsPresetId: data.termsPresetId,
          freight: data.freight,
          additionalDiscount: data.additionalDiscount,
          customerSignature: data.customerSignature,
          customerSignedAt: data.customerSignedAt ? new Date(data.customerSignedAt) : null,
          revisionNumber: data.revisionNumber
        }
      });
      if (data.items && Array.isArray(data.items)) {
        for (const item of data.items) {
          await prisma.quotationItems.create({
            data: {
              quotationId: data.id,
              productId: item.productId,
              productName: item.productName || "Product",
              description: item.description,
              hsnCode: item.hsnCode,
              quantity: item.quantity || 1,
              rate: item.rate || 0,
              discountPercent: item.discountPercent || 0,
              gstPercent: item.gstPercent || 18
            }
          });
        }
      }
    } else if (model === "invoices" || model === "proforma_invoices") {
      await prisma.invoiceItems.deleteMany({ where: { invoiceId: data.id } });
      if (data.customerId) {
        const custExists = await prisma.customers.findUnique({ where: { id: data.customerId } });
        if (!custExists) {
          await prisma.customers.create({
            data: { id: data.customerId, name: "Placeholder Customer", state: "Maharashtra" }
          });
        }
      }
      await prisma.invoices.upsert({
        where: { id: data.id },
        update: {
          invoiceNo: data.invoiceNo,
          quotationNo: data.quotationNo,
          date: data.date ? new Date(data.date) : /* @__PURE__ */ new Date(),
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          customerId: data.customerId,
          subject: data.subject,
          subtotal: data.subtotal || 0,
          discountTotal: data.discountTotal || 0,
          cgstTotal: data.cgstTotal || 0,
          sgstTotal: data.sgstTotal || 0,
          igstTotal: data.igstTotal || 0,
          grandTotal: data.grandTotal || 0,
          status: data.status,
          terms: data.terms,
          companyId: data.companyId,
          termsPresetId: data.termsPresetId,
          freight: data.freight,
          additionalDiscount: data.additionalDiscount,
          customerSignature: data.customerSignature,
          customerSignedAt: data.customerSignedAt ? new Date(data.customerSignedAt) : null
        },
        create: {
          id: data.id,
          invoiceNo: data.invoiceNo,
          quotationNo: data.quotationNo,
          date: data.date ? new Date(data.date) : /* @__PURE__ */ new Date(),
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          customerId: data.customerId,
          subject: data.subject,
          subtotal: data.subtotal || 0,
          discountTotal: data.discountTotal || 0,
          cgstTotal: data.cgstTotal || 0,
          sgstTotal: data.sgstTotal || 0,
          igstTotal: data.igstTotal || 0,
          grandTotal: data.grandTotal || 0,
          status: data.status,
          terms: data.terms,
          companyId: data.companyId,
          termsPresetId: data.termsPresetId,
          freight: data.freight,
          additionalDiscount: data.additionalDiscount,
          customerSignature: data.customerSignature,
          customerSignedAt: data.customerSignedAt ? new Date(data.customerSignedAt) : null
        }
      });
      if (data.items && Array.isArray(data.items)) {
        for (const item of data.items) {
          await prisma.invoiceItems.create({
            data: {
              invoiceId: data.id,
              productId: item.productId,
              productName: item.productName || "Product",
              description: item.description,
              hsnCode: item.hsnCode,
              quantity: item.quantity || 1,
              rate: item.rate || 0,
              discountPercent: item.discountPercent || 0,
              gstPercent: item.gstPercent || 18
            }
          });
        }
      }
    } else if (model === "challans") {
      await prisma.deliveryChallanItems.deleteMany({ where: { deliveryChallanId: data.id } });
      if (data.customerId) {
        const custExists = await prisma.customers.findUnique({ where: { id: data.customerId } });
        if (!custExists) {
          await prisma.customers.create({
            data: { id: data.customerId, name: "Placeholder Customer", state: "Maharashtra" }
          });
        }
      }
      await prisma.deliveryChallans.upsert({
        where: { id: data.id },
        update: {
          challanNo: data.challanNo,
          date: data.date ? new Date(data.date) : /* @__PURE__ */ new Date(),
          customerId: data.customerId,
          vehicleNo: data.vehicleNo,
          transporter: data.transporter,
          lrNumber: data.lrNumber,
          dispatchAddress: data.dispatchAddress,
          status: data.status,
          notes: data.notes,
          companyId: data.companyId
        },
        create: {
          id: data.id,
          challanNo: data.challanNo,
          date: data.date ? new Date(data.date) : /* @__PURE__ */ new Date(),
          customerId: data.customerId,
          vehicleNo: data.vehicleNo,
          transporter: data.transporter,
          lrNumber: data.lrNumber,
          dispatchAddress: data.dispatchAddress,
          status: data.status,
          notes: data.notes,
          companyId: data.companyId
        }
      });
      if (data.items && Array.isArray(data.items)) {
        for (const item of data.items) {
          await prisma.deliveryChallanItems.create({
            data: {
              deliveryChallanId: data.id,
              productName: item.productName || "Product",
              quantity: item.quantity || 1,
              hsnCode: item.hsnCode,
              description: item.description
            }
          });
        }
      }
    } else if (model === "leads") {
      await prisma.leads.upsert({
        where: { id: data.id },
        update: {
          customerId: data.customerId,
          name: data.name,
          company: data.company,
          email: data.email,
          phone: data.phone,
          value: data.value || 0,
          status: data.status,
          source: data.source,
          notes: data.notes,
          date: data.date ? new Date(data.date) : null,
          conversionStatus: data.conversionStatus
        },
        create: {
          id: data.id,
          customerId: data.customerId,
          name: data.name,
          company: data.company,
          email: data.email,
          phone: data.phone,
          value: data.value || 0,
          status: data.status,
          source: data.source,
          notes: data.notes,
          date: data.date ? new Date(data.date) : null,
          conversionStatus: data.conversionStatus
        }
      });
    } else if (model === "subscriptions") {
      if (data.customerId) {
        const custExists = await prisma.customers.findUnique({ where: { id: data.customerId } });
        if (!custExists) {
          await prisma.customers.create({
            data: { id: data.customerId, name: "Placeholder Customer", state: "Maharashtra" }
          });
        }
      }
      await prisma.subscriptions.upsert({
        where: { id: data.id },
        update: {
          customerId: data.customerId,
          serviceName: data.serviceName,
          amount: data.amount || 0,
          billingCycle: data.billingCycle,
          startDate: data.startDate ? new Date(data.startDate) : /* @__PURE__ */ new Date(),
          nextRenewalDate: data.nextRenewalDate ? new Date(data.nextRenewalDate) : /* @__PURE__ */ new Date(),
          status: data.status,
          description: data.description
        },
        create: {
          id: data.id,
          customerId: data.customerId,
          serviceName: data.serviceName,
          amount: data.amount || 0,
          billingCycle: data.billingCycle,
          startDate: data.startDate ? new Date(data.startDate) : /* @__PURE__ */ new Date(),
          nextRenewalDate: data.nextRenewalDate ? new Date(data.nextRenewalDate) : /* @__PURE__ */ new Date(),
          status: data.status,
          description: data.description
        }
      });
    } else if (model === "reminders") {
      await prisma.reminders.upsert({
        where: { id: data.id },
        update: {
          title: data.title,
          description: data.description,
          dueDate: data.dueDate ? new Date(data.dueDate) : /* @__PURE__ */ new Date(),
          status: data.status,
          priority: data.priority,
          relatedTo: data.relatedTo,
          subscriptionId: data.subscriptionId,
          customerId: data.customerId
        },
        create: {
          id: data.id,
          title: data.title,
          description: data.description,
          dueDate: data.dueDate ? new Date(data.dueDate) : /* @__PURE__ */ new Date(),
          status: data.status,
          priority: data.priority,
          relatedTo: data.relatedTo,
          subscriptionId: data.subscriptionId,
          customerId: data.customerId
        }
      });
    } else if (model === "inventory") {
      const cleanSku = data.sku ? data.sku.toUpperCase().trim() : "";
      const cleanQuantity = Number(data.quantity) || 0;
      const cleanMinQty = Number(data.minQuantity) || 0;
      const cleanUnitPrice = Number(data.unitPrice) || 0;
      const cleanLatestPurchasePrice = data.latestPurchasePrice !== void 0 && data.latestPurchasePrice !== null && data.latestPurchasePrice !== "" ? Number(data.latestPurchasePrice) : null;
      await prisma.inventoryLogs.deleteMany({ where: { inventoryItemId: data.id } });
      if (cleanSku) {
        const prodExists = await prisma.products.findUnique({ where: { sku: cleanSku } });
        if (!prodExists) {
          const placeholderId = `prod_placeholder_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
          await prisma.products.create({
            data: {
              id: placeholderId,
              name: data.productName || `Product for SKU ${cleanSku}`,
              sku: cleanSku,
              rate: cleanUnitPrice || 0,
              gstRate: 18,
              description: "Automatically created placeholder product for inventory item"
            }
          });
        }
      }
      await prisma.inventoryItems.upsert({
        where: { id: data.id },
        update: {
          sku: cleanSku,
          productName: data.productName || "Product",
          category: data.category || null,
          quantity: cleanQuantity,
          minQuantity: cleanMinQty,
          purchaseFrom: data.purchaseFrom || null,
          unitPrice: cleanUnitPrice,
          latestPurchasePrice: cleanLatestPurchasePrice,
          lastUpdated: data.lastUpdated ? new Date(data.lastUpdated) : /* @__PURE__ */ new Date()
        },
        create: {
          id: data.id,
          sku: cleanSku,
          productName: data.productName || "Product",
          category: data.category || null,
          quantity: cleanQuantity,
          minQuantity: cleanMinQty,
          purchaseFrom: data.purchaseFrom || null,
          unitPrice: cleanUnitPrice,
          latestPurchasePrice: cleanLatestPurchasePrice,
          lastUpdated: data.lastUpdated ? new Date(data.lastUpdated) : /* @__PURE__ */ new Date()
        }
      });
      if (data.logs && Array.isArray(data.logs)) {
        for (const log of data.logs) {
          await prisma.inventoryLogs.create({
            data: {
              // Note: We omit the id here so the database's @default(uuid()) is used.
              // This guarantees no primary key conflicts across the entire database.
              inventoryItemId: data.id,
              date: log.date ? new Date(log.date) : /* @__PURE__ */ new Date(),
              type: log.type || "IN",
              quantity: Number(log.quantity) || 0,
              reason: log.reason || null,
              prevQty: Number(log.prevQty) || 0,
              newQty: Number(log.newQty) || 0,
              supplierName: log.supplierName || null,
              customerName: log.customerName || null
            }
          });
        }
      }
    }
    res.json({ success: true, message: `Successfully saved ${model} entry` });
  } catch (error) {
    console.error(`Direct save failed for model ${model}:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});
app.post("/api/db/delete", async (req, res) => {
  const { model, id } = req.body;
  if (!model || !id) {
    return res.status(400).json({ success: false, error: "Model and id are required" });
  }
  try {
    console.log(`Direct entry delete requested: model=${model}, id=${id}`);
    if (model === "customers") {
      await prisma.customers.delete({ where: { id } });
    } else if (model === "products") {
      await prisma.products.delete({ where: { id } });
    } else if (model === "quotations") {
      await prisma.quotationItems.deleteMany({ where: { quotationId: id } });
      await prisma.quotations.delete({ where: { id } });
    } else if (model === "invoices" || model === "proforma_invoices") {
      await prisma.invoiceItems.deleteMany({ where: { invoiceId: id } });
      await prisma.invoices.delete({ where: { id } });
    } else if (model === "challans") {
      await prisma.deliveryChallanItems.deleteMany({ where: { deliveryChallanId: id } });
      await prisma.deliveryChallans.delete({ where: { id } });
    } else if (model === "leads") {
      await prisma.leads.delete({ where: { id } });
    } else if (model === "subscriptions") {
      await prisma.subscriptions.delete({ where: { id } });
    } else if (model === "reminders") {
      await prisma.reminders.delete({ where: { id } });
    } else if (model === "inventory") {
      await prisma.inventoryLogs.deleteMany({ where: { inventoryItemId: id } });
      await prisma.inventoryItems.delete({ where: { id } });
    } else if (model === "company_profiles") {
      await prisma.termsPresets.deleteMany({ where: { companyProfileId: id } });
      await prisma.companyProfiles.delete({ where: { id } });
    }
    res.json({ success: true, message: `Deleted ${id} from ${model}` });
  } catch (error) {
    console.error(`Direct delete failed for ${model}:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});
app.get("/api/db/get", async (req, res) => {
  try {
    console.log("Fetching database from Prisma models...");
    const result = await getFromPrisma();
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error fetching db:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});
app.get("/api/amazon/orders", async (req, res) => {
  try {
    const ordersMap = /* @__PURE__ */ new Map();
    try {
      const metaRes = await prisma.appData.findUnique({ where: { key: "amazon_orders_meta" } });
      if (metaRes && metaRes.dataJson) {
        const metaData = JSON.parse(metaRes.dataJson);
        const chunkCount = metaData.chunkCount || 0;
        if (chunkCount > 0) {
          const chunkPromises = [];
          for (let i = 0; i < chunkCount; i++) {
            chunkPromises.push(prisma.appData.findUnique({ where: { key: `amazon_orders_chunk_${i}` } }));
          }
          const chunkResults = await Promise.all(chunkPromises);
          for (const chunkRes of chunkResults) {
            if (chunkRes && chunkRes.dataJson) {
              const chunkData = JSON.parse(chunkRes.dataJson);
              if (chunkData && chunkData.orders && Array.isArray(chunkData.orders)) {
                for (const o of chunkData.orders) {
                  if (o && o.orderId) {
                    ordersMap.set(o.orderId, o);
                  }
                }
              }
            }
          }
        }
      }
    } catch (chunkErr) {
      console.warn("Failed to fetch chunked Amazon orders from Prisma:", chunkErr);
    }
    const finalOrders = Array.from(ordersMap.values());
    finalOrders.sort((a, b) => {
      const dateA = new Date(a.purchaseDate || 0).getTime();
      const dateB = new Date(b.purchaseDate || 0).getTime();
      return dateB - dateA;
    });
    res.json({ success: true, data: finalOrders });
  } catch (err) {
    console.error("Firestore Amazon orders query failed:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/amazon/orders", async (req, res) => {
  const { orders } = req.body || {};
  if (!orders || !Array.isArray(orders)) {
    return res.status(400).json({ success: false, error: "Orders array is required" });
  }
  try {
    const ordersMap = /* @__PURE__ */ new Map();
    for (const order of orders) {
      if (order && order.orderId) {
        ordersMap.set(order.orderId, order);
      }
    }
    const mergedOrders = Array.from(ordersMap.values());
    mergedOrders.sort((a, b) => {
      const dateA = new Date(a.purchaseDate || 0).getTime();
      const dateB = new Date(b.purchaseDate || 0).getTime();
      return dateB - dateA;
    });
    const cappedOrders = mergedOrders.slice(0, 4e3);
    res.json({ success: true, data: cappedOrders });
    const backgroundTask = (async () => {
      try {
        const metaRes = await prisma.appData.findUnique({ where: { key: "amazon_orders_meta" } });
        const prevChunkCount = metaRes?.dataJson ? JSON.parse(metaRes.dataJson)?.chunkCount || 0 : 0;
        const chunkSize = 1e3;
        const newChunkCount = Math.ceil(cappedOrders.length / chunkSize);
        for (let c = 0; c < newChunkCount; c++) {
          const chunkData = cappedOrders.slice(c * chunkSize, (c + 1) * chunkSize);
          await prisma.appData.upsert({
            where: { key: `amazon_orders_chunk_${c}` },
            update: { dataJson: JSON.stringify({ orders: chunkData }), updatedAt: (/* @__PURE__ */ new Date()).toISOString() },
            create: { key: `amazon_orders_chunk_${c}`, dataJson: JSON.stringify({ orders: chunkData }), updatedAt: (/* @__PURE__ */ new Date()).toISOString() }
          });
        }
        await prisma.appData.upsert({
          where: { key: "amazon_orders_meta" },
          update: {
            dataJson: JSON.stringify({
              chunkCount: newChunkCount,
              totalCount: cappedOrders.length,
              lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
            }),
            updatedAt: (/* @__PURE__ */ new Date()).toISOString()
          },
          create: {
            key: "amazon_orders_meta",
            dataJson: JSON.stringify({
              chunkCount: newChunkCount,
              totalCount: cappedOrders.length,
              lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
            }),
            updatedAt: (/* @__PURE__ */ new Date()).toISOString()
          }
        });
        if (prevChunkCount > newChunkCount) {
          for (let p = newChunkCount; p < prevChunkCount; p++) {
            await prisma.appData.delete({ where: { key: `amazon_orders_chunk_${p}` } }).catch(() => {
            });
          }
        }
        console.log(`[Background Prisma Sync] Successfully updated ${cappedOrders.length} orders in cloud storage.`);
      } catch (postgresWriteErr) {
        console.error("[Background Prisma Sync] Cloud backup failed:", postgresWriteErr.message);
      }
    })();
    if (process.env.VERCEL) {
      await backgroundTask;
    }
  } catch (err) {
    console.error("Error updating Amazon orders:", err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
});
app.get("/api/gst/fetch", async (req, res) => {
  try {
    const { gstin } = req.query;
    if (!gstin || typeof gstin !== "string") {
      return res.status(400).json({ success: false, error: "GSTIN is required" });
    }
    const cleanGstin = gstin.trim().toUpperCase();
    if (cleanGstin.length !== 15) {
      return res.status(400).json({ success: false, error: "GSTIN must be exactly 15 characters long" });
    }
    const stateCode = cleanGstin.substring(0, 2);
    const stateName = gstStateCodes[stateCode] || "Maharashtra";
    try {
      const appyflowUrl = `https://sheet.appyflow.in/api/verifyGST?gstin=${cleanGstin}&key=free`;
      const response = await fetch(appyflowUrl, { signal: AbortSignal.timeout(1200) });
      if (response.ok) {
        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const respJson = await response.json();
          if (respJson && !respJson.error && respJson.taxpayerInfo) {
            const info = respJson.taxpayerInfo;
            const companyName = info.tradeNam || info.lgnm || `Gst Business (${cleanGstin.substring(2, 10)})`;
            const legalName = info.lgnm || "Authorized Representative";
            const dbaState = info.prb?.state || stateName;
            const streetAddr = [
              info.prb?.bno,
              info.prb?.bnm,
              info.prb?.st,
              info.prb?.loc,
              info.prb?.dst,
              info.prb?.pncd
            ].filter(Boolean).join(", ");
            const address = streetAddr || `${dbaState}, India`;
            console.log(`GSTIN "${cleanGstin}" successfully fetched using live free Appyflow API!`);
            return res.json({
              success: true,
              data: {
                company: companyName,
                name: legalName,
                email: `${companyName.toLowerCase().replace(/[^a-z0-9]/g, "")}@gmail.com`,
                phone: "+91 98765 43210",
                state: dbaState,
                billingAddress: address,
                shippingAddress: address,
                gstin: cleanGstin,
                source: "live_registry"
              }
            });
          }
        } else {
          console.warn("Appyflow response is not JSON, bypassing.");
        }
      }
    } catch (apiErr) {
      console.warn("Appyflow live lookup bypassed/failed (expected on free tier), falling back:", apiErr.message || apiErr);
    }
    try {
      const ai = getAI();
      if (!ai) {
        throw new Error("Gemini AI API key not configured");
      }
      const prompt = `You are a professional Indian corporate compliance officer and taxpayer data expert.
Synthesize structurally authentic, highly realistic Indian corporate taxpayer details for the GSTIN: "${cleanGstin}".
Indian State: "${stateName}" (State Code: "${stateCode}").

The business name should sound like an authentic, real Indian corporate taxpayer matching the state (e.g. matching major business names, trade labels, or random realistic enterprise names like "Naman Logistics Pvt Ltd", "Bajaj Auto Sales", "Devi Trading Company", "Arun Agro Industries", "Shree Balaji Textiles", etc.).
Construct a highly realistic street address in ${stateName}, complete with building name, shop/office number, street, industrial area/commercial hub, city, and correct PIN code matching ${stateName}.

Return response in strict JSON format (do NOT wrap in markdown \`\`\`json or any extra text, strictly output raw valid JSON):
{
  "company": "Trading Name or Business Name",
  "name": "Legal Registered Name (e.g., Authorized Proprietor or Director Name)",
  "email": "contact@businessdomain.in",
  "phone": "+91 98765 43210",
  "state": "${stateName}",
  "billingAddress": "Realistic complete billing address in ${stateName}, India",
  "shippingAddress": "Realistic complete shipping address in ${stateName}, India",
  "gstin": "${cleanGstin}"
}`;
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });
      const responseText = response.text || "";
      const parsedData = JSON.parse(responseText.trim());
      console.log(`GSTIN "${cleanGstin}" successfully synthesized using Gemini 3.5 Flash!`);
      return res.json({
        success: true,
        data: {
          ...parsedData,
          source: "gemini_synthesis"
        }
      });
    } catch (aiErr) {
      console.error("Gemini synthesis fallback failed, using local deterministic fallback:", aiErr.message || aiErr);
      const defaultCompanyName = `Enterprise ${cleanGstin.substring(2, 6)} Trading`;
      const fallbackAddress = `Sector 4, Industrial Area, Noida, ${stateName}, India`;
      return res.json({
        success: true,
        data: {
          company: defaultCompanyName,
          name: "Proprietor Representative",
          email: `${defaultCompanyName.toLowerCase().replace(/[^a-z0-9]/g, "")}@gmail.com`,
          phone: "+91 98765 43210",
          state: stateName,
          billingAddress: fallbackAddress,
          shippingAddress: fallbackAddress,
          gstin: cleanGstin,
          source: "local_deterministic_fallback"
        }
      });
    }
  } catch (globalErr) {
    console.error("Critical error in /api/gst/fetch route:", globalErr);
    return res.status(500).json({ success: false, error: globalErr.message || "Unknown error during GST fetch" });
  }
});
app.post("/api/marketing/generate", async (req, res) => {
  const { productName, description, rate, sku, theme } = req.body;
  if (!productName) {
    return res.status(400).json({ success: false, error: "Product name is required" });
  }
  const selectedTheme = theme || "Professional & Trustworthy";
  try {
    const prompt = `You are a high-converting professional marketing copywriter. Generate promotional ad content and a WhatsApp message for the following product:
- Product Name: ${productName}
- SKU: ${sku || "N/A"}
- Price / Rate: INR ${rate || "On Request"}
- Original details: ${description || "N/A"}
- Marketing Tone / Theme: ${selectedTheme}

Return response purely in JSON format (do NOT wrap in markdown \`\`\`json or any extra text, strictly output raw valid JSON):
{
  "headline": "A short, extremely catchy, high-impact headline",
  "subheading": "A secondary tag line or sub-header to build excitement",
  "highlights": [
    "Compelling benefit or key feature 1",
    "Compelling benefit or key feature 2",
    "Compelling benefit or key feature 3"
  ],
  "whatsappText": "A complete, beautifully formatted promotional WhatsApp broadcast message. Use friendly emojis, clean paragraph spacings, and standard styling (e.g. *bold text* using asterisks) tailored to double sales. Include the price (INR ${rate || "On Request"}) and a clear call-to-action to reply!"
}`;
    const ai = getAI();
    if (!ai) {
      throw new Error("GEMINI_API_KEY is not configured.");
    }
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });
    const responseText = response.text || "";
    const parsedData = JSON.parse(responseText.trim());
    res.json({
      success: true,
      data: parsedData
    });
  } catch (err) {
    console.error("Gemini marketing synthesis failed:", err);
    res.json({
      success: true,
      data: {
        headline: `Premium Quality ${productName}!`,
        subheading: `Benchmark engineering crafted to support your core operations.`,
        highlights: [
          `Built for maximum uptime & optimized output.`,
          `Unmatched manufacturing standards and design specs.`,
          `Complete client satisfaction guarantee with corporate warranty.`
        ],
        whatsappText: `*\u2728 Special Product Spotlight: ${productName.toUpperCase()} \u2728*

Deliver the absolute best to your workshop or operations with our flagship choice!

*Highlight features:*
\u2705 Heavy-duty standard certification
\u2705 Expertly designed for performance durability
\u2705 Best-in-class value for INR ${rate || "On Request"}

\u{1F4AC} *Interested? Reply directly to this WhatsApp message, and our sales team will finalize your dispatch details!*`
      }
    });
  }
});
app.post("/api/marketing/generate-image", async (req, res) => {
  const { productName, promptOverride } = req.body;
  if (!productName) {
    return res.status(400).json({ success: false, error: "Product name is required" });
  }
  try {
    const ai = getAI();
    if (!ai) {
      throw new Error("GEMINI_API_KEY is not configured.");
    }
    const promptText = promptOverride || `Professional high-quality product photography of a ${productName}. Clean studio lighting, white background, minimalist and high contrast, photorealistic, 4k.`;
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: {
        parts: [{ text: promptText }]
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });
    let base64EncodeString = "";
    if (response.candidates && response.candidates.length > 0 && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          base64EncodeString = part.inlineData.data;
          break;
        }
      }
    }
    if (base64EncodeString) {
      res.json({
        success: true,
        imageUrl: `data:image/png;base64,${base64EncodeString}`
      });
    } else {
      throw new Error("Failed to extract image data from Model Response");
    }
  } catch (err) {
    console.error("Gemini image generation failed:", err);
    res.json({
      success: true,
      imageUrl: `https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500&auto=format&fit=crop`
    });
  }
});
app.get("/api/users", async (req, res) => {
  try {
    const users = await prisma.userProfiles.findMany();
    const profiles = users.map((u) => ({
      ...u,
      rights: u.rights ? JSON.parse(u.rights) : {}
    }));
    res.json({ success: true, users: profiles });
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/users/create", async (req, res) => {
  const { email, password, name, role, rights } = req.body;
  try {
    const userId = "user_" + Math.random().toString(36).substring(2, 15);
    const resolvedRole = role || "Employee";
    const userProfile = {
      id: userId,
      name: name || "New User",
      email: email || "",
      role: resolvedRole,
      password: password || "pass",
      isActive: true,
      rights: rights ? JSON.stringify(rights) : "{}",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    const newUser = await prisma.userProfiles.create({ data: userProfile });
    res.json({ success: true, user: { ...newUser, rights: rights || {} } });
  } catch (err) {
    console.error("Error creating backend user:", err);
    res.status(400).json({ success: false, error: err.message });
  }
});
app.post("/api/users/update", async (req, res) => {
  const { id, name, role, password, isActive, rights } = req.body;
  try {
    const updateData = {};
    if (name !== void 0) updateData.name = name;
    if (role !== void 0) updateData.role = role;
    if (password !== void 0) updateData.password = password;
    if (isActive !== void 0) updateData.isActive = isActive;
    if (rights !== void 0) updateData.rights = JSON.stringify(rights);
    await prisma.userProfiles.update({
      where: { id },
      data: updateData
    });
    res.json({ success: true });
  } catch (err) {
    console.error("Error updating backend user:", err);
    res.status(400).json({ success: false, error: err.message });
  }
});
app.post("/api/users/delete", async (req, res) => {
  const { id } = req.body;
  try {
    await prisma.userProfiles.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting backend user:", err);
    res.status(400).json({ success: false, error: err.message });
  }
});
app.post("/api/users/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const users = await prisma.userProfiles.findMany();
    const foundUser = users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );
    if (!foundUser) {
      return res.status(401).json({ success: false, error: "Incorrect email address or password" });
    }
    if (foundUser.password !== password) {
      return res.status(401).json({ success: false, error: "Incorrect email address or password" });
    }
    if (!foundUser.isActive) {
      return res.status(403).json({ success: false, error: "This user account is inactive" });
    }
    res.json({ success: true, user: { ...foundUser, rights: foundUser.rights ? JSON.parse(foundUser.rights) : {} } });
  } catch (err) {
    console.error("Error logging in backend user:", err);
    res.status(401).json({ success: false, error: "Login failed" });
  }
});
app.post("/api/send-email", async (req, res) => {
  const { to, subject, text, pdfBase64, filename } = req.body;
  try {
    let transporter;
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      transporter = import_nodemailer.default.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
    } else {
      console.log("No SMTP credentials found. Creating Ethereal test account...");
      const testAccount = await import_nodemailer.default.createTestAccount();
      transporter = import_nodemailer.default.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
    }
    const pdfData = pdfBase64.split("base64,")[1] || pdfBase64;
    const pdfBuffer = Buffer.from(pdfData, "base64");
    const info = await transporter.sendMail({
      from: '"Sales Application" <sales@application.local>',
      to,
      subject,
      text,
      attachments: [
        {
          filename: filename || "document.pdf",
          content: pdfBuffer,
          contentType: "application/pdf"
        }
      ]
    });
    const previewUrl = import_nodemailer.default.getTestMessageUrl(info);
    if (previewUrl) {
      console.log("Message sent: %s", info.messageId);
      console.log("Preview URL: %s", previewUrl);
    }
    res.json({ success: true, messageId: info.messageId, previewUrl });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ success: false, error: "Failed to send email" });
  }
});
async function seedDefaultUsers() {
  const defaultAdmin = {
    id: "admin_default",
    name: "System Administrator",
    email: "admin@application.local",
    password: "pass",
    role: "Admin",
    isActive: true,
    rights: {
      dashboard: true,
      quotations: true,
      proforma: true,
      challans: true,
      leads: true,
      customers: true,
      products: true,
      inventory: true,
      subscriptions: true,
      reminders: true,
      amazonSeller: true,
      catalogues: true,
      settings: true
    },
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  const defaultRajan = {
    id: "rajan_default",
    name: "Rajan Ghanshyam",
    email: "rajan@devinfotech.net",
    password: "Devansh@2007",
    role: "Admin",
    isActive: true,
    rights: {
      dashboard: true,
      quotations: true,
      proforma: true,
      challans: true,
      leads: true,
      customers: true,
      products: true,
      inventory: true,
      subscriptions: true,
      reminders: true,
      amazonSeller: true,
      catalogues: true,
      settings: true
    },
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  const defaultRajanGmail = {
    id: "rajan_gmail",
    name: "Rajan Ghanshyam",
    email: "rajanghanshyam@gmail.com",
    password: "Devansh@2007",
    role: "Admin",
    isActive: true,
    rights: {
      dashboard: true,
      quotations: true,
      proforma: true,
      challans: true,
      leads: true,
      customers: true,
      products: true,
      inventory: true,
      subscriptions: true,
      reminders: true,
      amazonSeller: true,
      catalogues: true,
      settings: true
    },
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  try {
    const adminExists = await prisma.userProfiles.findUnique({ where: { id: "admin_default" } });
    if (!adminExists) {
      await prisma.userProfiles.create({
        data: {
          id: defaultAdmin.id,
          name: defaultAdmin.name,
          email: defaultAdmin.email,
          role: defaultAdmin.role,
          password: defaultAdmin.password,
          isActive: defaultAdmin.isActive,
          rights: JSON.stringify(defaultAdmin.rights)
        }
      });
      console.log("Seeded default admin in Prisma.");
    }
    const rajanExists = await prisma.userProfiles.findUnique({ where: { id: "rajan_default" } });
    if (!rajanExists) {
      await prisma.userProfiles.create({
        data: {
          id: defaultRajan.id,
          name: defaultRajan.name,
          email: defaultRajan.email,
          role: defaultRajan.role,
          password: defaultRajan.password,
          isActive: defaultRajan.isActive,
          rights: JSON.stringify(defaultRajan.rights)
        }
      });
      console.log("Seeded Rajan user in Prisma.");
    }
    const rajanGmailExists = await prisma.userProfiles.findUnique({ where: { id: "rajan_gmail" } });
    if (!rajanGmailExists) {
      await prisma.userProfiles.create({
        data: {
          id: defaultRajanGmail.id,
          name: defaultRajanGmail.name,
          email: defaultRajanGmail.email,
          role: defaultRajanGmail.role,
          password: defaultRajanGmail.password,
          isActive: defaultRajanGmail.isActive,
          rights: JSON.stringify(defaultRajanGmail.rights)
        }
      });
      console.log("Seeded Rajan Gmail user in Prisma.");
    }
  } catch (error) {
    console.warn("Prisma user seeding failed:", error);
  }
}
async function startServer() {
  try {
    await performSchemaMigrationCheck();
    await seedDefaultUsers();
    if (process.env.NODE_ENV !== "production") {
      try {
        const vite = await (0, import_vite.createServer)({
          server: { middlewareMode: true },
          appType: "spa"
        });
        app.use(vite.middlewares);
      } catch (viteErr) {
        console.error("Failed to start Vite dev server in middlewareMode:", viteErr);
        const distPath = import_path.default.join(process.cwd(), "dist");
        app.use(import_express.default.static(distPath));
        app.get("*", (req, res) => {
          res.sendFile(import_path.default.join(distPath, "index.html"));
        });
      }
    } else {
      const distPath = import_path.default.join(process.cwd(), "dist");
      app.use(import_express.default.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(import_path.default.join(distPath, "index.html"));
      });
    }
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
  } catch (error) {
    console.error("CRITICAL Error during startServer:", error);
    try {
      const distPath = import_path.default.join(process.cwd(), "dist");
      app.use(import_express.default.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(import_path.default.join(distPath, "index.html"));
      });
    } catch (innerErr) {
      console.error("Failsafe failed to setup static serving:", innerErr);
    }
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running in CRITICAL FAILSAFE mode on http://0.0.0.0:${PORT}`);
    });
  }
}
if (!process.env.VERCEL) {
  startServer();
}
var server_default = app;
//# sourceMappingURL=server.cjs.map

import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Price point structure for storing historical price data
export type PricePoint = {
  date: string;
  price: number;
};

// Product table
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  url: text("url").notNull(),
  title: text("title").notNull(),
  currentPrice: integer("current_price").notNull(),
  originalPrice: integer("original_price").notNull(),
  imageUrl: text("image_url").notNull(),
  lastChecked: timestamp("last_checked").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  notifyOnDrop: boolean("notify_on_drop").notNull().default(true),
  dropPercentage: integer("drop_percentage").notNull().default(60),
  priceHistory: jsonb("price_history").$type<PricePoint[]>().notNull().default([]),
});

export const insertProductSchema = createInsertSchema(products).pick({
  url: true,
  notifyOnDrop: true,
}).extend({
  dropPercentage: z.string().transform(val => parseInt(val)),
});

// Notification table
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  productName: text("product_name").notNull(),
  productUrl: text("product_url").notNull(),
  oldPrice: integer("old_price").notNull(),
  newPrice: integer("new_price").notNull(),
  percentageDropped: integer("percentage_dropped").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  read: boolean("read").notNull().default(false),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

// Type declarations
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { insertProductSchema } from "@shared/schema";
import { amazonScraper } from "./services/amazonScraper";
import { priceTracker } from "./services/priceTracker";

export async function registerRoutes(app: Express): Promise<Server> {
  const apiRouter = express.Router();
  
  // Initialize price tracking service
  priceTracker.initialize();
  
  // Get all products
  apiRouter.get("/products", async (req, res) => {
    try {
      const products = await storage.getAllProducts();
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });
  
  // Add new product
  apiRouter.post("/products", async (req, res) => {
    try {
      const validationResult = insertProductSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        const errorMessage = fromZodError(validationResult.error).message;
        return res.status(400).json({ message: errorMessage });
      }
      
      const productData = validationResult.data;
      
      // Check if product URL is already being tracked
      const existingProduct = await storage.getProductByUrl(productData.url);
      if (existingProduct) {
        return res.status(409).json({ message: "This product is already being tracked" });
      }
      
      // Scrape product details from Amazon
      try {
        const scrapedData = await amazonScraper.scrapeProduct(productData.url);
        
        if (!scrapedData) {
          return res.status(400).json({ message: "Failed to extract product information from the provided URL" });
        }
        
        // Create price history point for initial price
        const pricePoint = {
          date: new Date().toISOString(),
          price: scrapedData.currentPrice
        };
        
        // Create new product
        const newProduct = await storage.createProduct({
          url: productData.url,
          title: scrapedData.title,
          currentPrice: scrapedData.currentPrice,
          originalPrice: scrapedData.originalPrice,
          imageUrl: scrapedData.imageUrl,
          notifyOnDrop: productData.notifyOnDrop || true,
          dropPercentage: productData.dropPercentage,
          priceHistory: [pricePoint]
        });
        
        res.status(201).json(newProduct);
      } catch (error) {
        return res.status(400).json({ message: "Failed to extract product information from Amazon" });
      }
    } catch (error) {
      console.error("Error adding product:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Get product by ID
  apiRouter.get("/products/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }
      
      const product = await storage.getProduct(id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      res.json(product);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });
  
  // Delete product
  apiRouter.delete("/products/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }
      
      const product = await storage.getProduct(id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      await storage.deleteProduct(id);
      res.status(200).json({ message: "Product removed successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete product" });
    }
  });
  
  // Get product price history
  apiRouter.get("/products/:id/history", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }
      
      const product = await storage.getProduct(id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      res.json(product.priceHistory);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch price history" });
    }
  });
  
  // Get all notifications
  apiRouter.get("/notifications", async (req, res) => {
    try {
      const notifications = await storage.getAllNotifications();
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });
  
  // Create notification
  apiRouter.post("/notifications", async (req, res) => {
    try {
      const notificationSchema = z.object({
        productId: z.number(),
        productName: z.string(),
        productUrl: z.string(),
        oldPrice: z.number(),
        newPrice: z.number(),
        percentageDropped: z.number(),
        read: z.boolean().default(false)
      });
      
      const validationResult = notificationSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        const errorMessage = fromZodError(validationResult.error).message;
        return res.status(400).json({ message: errorMessage });
      }
      
      const notificationData = validationResult.data;
      const newNotification = await storage.createNotification(notificationData);
      
      res.status(201).json(newNotification);
    } catch (error) {
      console.error("Error creating notification:", error);
      res.status(500).json({ message: "Failed to create notification" });
    }
  });
  
  // Mark notification as read
  apiRouter.patch("/notifications/:id/read", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid notification ID" });
      }
      
      const notification = await storage.getNotification(id);
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      
      await storage.markNotificationAsRead(id);
      res.status(200).json({ message: "Notification marked as read" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update notification" });
    }
  });
  
  // Force a price check on all products (for testing)
  apiRouter.post("/check-prices", async (req, res) => {
    try {
      await priceTracker.checkPrices();
      res.status(200).json({ message: "Price check initiated" });
    } catch (error) {
      res.status(500).json({ message: "Failed to check prices" });
    }
  });
  
  // Mount the API router
  app.use("/api", apiRouter);
  
  const httpServer = createServer(app);
  return httpServer;
}

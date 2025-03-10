import { 
  Product, 
  InsertProduct, 
  Notification, 
  InsertNotification,
  PricePoint
} from "@shared/schema";
import fs from 'fs';
import path from 'path';
import { log } from './vite';

export interface IStorage {
  // Product operations
  getProduct(id: number): Promise<Product | undefined>;
  getProductByUrl(url: string): Promise<Product | undefined>;
  getAllProducts(): Promise<Product[]>;
  createProduct(product: Omit<Product, "id" | "lastChecked" | "createdAt">): Promise<Product>;
  updateProduct(id: number, data: Partial<Omit<Product, "id" | "createdAt">>): Promise<Product>;
  deleteProduct(id: number): Promise<void>;
  addPricePoint(productId: number, pricePoint: PricePoint): Promise<void>;
  
  // Notification operations
  getNotification(id: number): Promise<Notification | undefined>;
  getAllNotifications(): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: number): Promise<void>;
  
  // Persistence operations
  saveData(): Promise<void>;
  loadData(): Promise<void>;
}

// Storage data format for persistence
interface StorageData {
  products: Product[];
  notifications: Notification[];
  productIdCounter: number;
  notificationIdCounter: number;
}

// Determine if running in Vercel or local dev environment
const isVercel = process.env.VERCEL === '1';

// Helper function to log messages with fallback for Vercel environment
const logMessage = (message: string, source = "storage") => {
  if (isVercel) {
    console.log(`[${source}] ${message}`);
  } else {
    log(message, source);
  }
};

export class MemStorage implements IStorage {
  private products: Map<number, Product>;
  private notifications: Map<number, Notification>;
  private productIdCounter: number;
  private notificationIdCounter: number;
  private dataFilePath: string;
  
  constructor() {
    this.products = new Map();
    this.notifications = new Map();
    this.productIdCounter = 1;
    this.notificationIdCounter = 1;
    this.dataFilePath = path.join(process.cwd(), 'data.json');
    
    // We'll load data manually after construction
  }
  
  // Product methods
  async getProduct(id: number): Promise<Product | undefined> {
    return this.products.get(id);
  }
  
  async getProductByUrl(url: string): Promise<Product | undefined> {
    // Convert to array first to avoid TypeScript iteration issues
    const productArray = Array.from(this.products.values());
    for (const product of productArray) {
      if (product.url === url) {
        return product;
      }
    }
    return undefined;
  }
  
  async getAllProducts(): Promise<Product[]> {
    return Array.from(this.products.values());
  }
  
  async createProduct(productData: Omit<Product, "id" | "lastChecked" | "createdAt">): Promise<Product> {
    const id = this.productIdCounter++;
    const now = new Date();
    
    const product: Product = {
      ...productData,
      id,
      lastChecked: now,
      createdAt: now
    };
    
    this.products.set(id, product);
    
    // Save data after creating product
    await this.saveData();
    
    return product;
  }
  
  async updateProduct(id: number, data: Partial<Omit<Product, "id" | "createdAt">>): Promise<Product> {
    const product = await this.getProduct(id);
    
    if (!product) {
      throw new Error(`Product with ID ${id} not found`);
    }
    
    const updatedProduct: Product = {
      ...product,
      ...data,
      lastChecked: data.lastChecked || new Date()
    };
    
    this.products.set(id, updatedProduct);
    
    // Save data after updating product
    await this.saveData();
    
    return updatedProduct;
  }
  
  async deleteProduct(id: number): Promise<void> {
    this.products.delete(id);
    
    // Save data after deleting product
    await this.saveData();
  }
  
  async addPricePoint(productId: number, pricePoint: PricePoint): Promise<void> {
    const product = await this.getProduct(productId);
    
    if (!product) {
      throw new Error(`Product with ID ${productId} not found`);
    }
    
    // Add new price point to history (keep maximum 30 points)
    const updatedHistory = [pricePoint, ...product.priceHistory].slice(0, 30);
    
    await this.updateProduct(productId, {
      priceHistory: updatedHistory,
      currentPrice: pricePoint.price
    });
  }
  
  // Notification methods
  async getNotification(id: number): Promise<Notification | undefined> {
    return this.notifications.get(id);
  }
  
  async getAllNotifications(): Promise<Notification[]> {
    return Array.from(this.notifications.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
  
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const id = this.notificationIdCounter++;
    const now = new Date();
    
    const newNotification: Notification = {
      ...notification,
      id,
      createdAt: now,
      read: notification.read || false
    };
    
    this.notifications.set(id, newNotification);
    
    // Save data after creating notification
    await this.saveData();
    
    return newNotification;
  }
  
  async markNotificationAsRead(id: number): Promise<void> {
    const notification = await this.getNotification(id);
    
    if (!notification) {
      throw new Error(`Notification with ID ${id} not found`);
    }
    
    this.notifications.set(id, {
      ...notification,
      read: true
    });
    
    // Save data after updating notification
    await this.saveData();
  }
  
  // Persistence methods
  async saveData(): Promise<void> {
    try {
      // In Vercel environment, we can't use file system for persistence
      if (isVercel) {
        logMessage(`Data saving not available in serverless environment - skipping`, "storage");
        return;
      }
      
      const data: StorageData = {
        products: Array.from(this.products.values()),
        notifications: Array.from(this.notifications.values()),
        productIdCounter: this.productIdCounter,
        notificationIdCounter: this.notificationIdCounter
      };
      
      await fs.promises.writeFile(this.dataFilePath, JSON.stringify(data, null, 2));
      logMessage(`Data saved to ${this.dataFilePath}`);
    } catch (error: any) {
      logMessage(`Error saving data: ${error.message || error}`);
    }
  }
  
  async loadData(): Promise<void> {
    try {
      // In Vercel environment, we'll use demo data instead
      if (isVercel) {
        logMessage(`Running in serverless environment - using in-memory storage only`);
        return;
      }
      
      // Check if data file exists
      if (!fs.existsSync(this.dataFilePath)) {
        logMessage(`No data file found at ${this.dataFilePath}`);
        return;
      }
      
      // Read and parse data
      const fileContent = await fs.promises.readFile(this.dataFilePath, 'utf-8');
      const data: StorageData = JSON.parse(fileContent);
      
      // Clear existing data
      this.products.clear();
      this.notifications.clear();
      
      // Restore products
      for (const product of data.products) {
        // Convert string dates to Date objects
        const restoredProduct: Product = {
          ...product,
          lastChecked: new Date(product.lastChecked),
          createdAt: new Date(product.createdAt)
        };
        this.products.set(product.id, restoredProduct);
      }
      
      // Restore notifications
      for (const notification of data.notifications) {
        // Convert string dates to Date objects
        const restoredNotification: Notification = {
          ...notification,
          createdAt: new Date(notification.createdAt)
        };
        this.notifications.set(notification.id, restoredNotification);
      }
      
      // Restore counters
      this.productIdCounter = data.productIdCounter;
      this.notificationIdCounter = data.notificationIdCounter;
      
      logMessage(`Loaded ${this.products.size} products and ${this.notifications.size} notifications from ${this.dataFilePath}`);
    } catch (error: any) {
      logMessage(`Error loading data: ${error.message || error}`);
    }
  }
}

export const storage = new MemStorage();

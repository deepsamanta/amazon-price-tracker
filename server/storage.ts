import { 
  Product, 
  InsertProduct, 
  Notification, 
  InsertNotification,
  PricePoint
} from "@shared/schema";

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
}

export class MemStorage implements IStorage {
  private products: Map<number, Product>;
  private notifications: Map<number, Notification>;
  private productIdCounter: number;
  private notificationIdCounter: number;
  
  constructor() {
    this.products = new Map();
    this.notifications = new Map();
    this.productIdCounter = 1;
    this.notificationIdCounter = 1;
  }
  
  // Product methods
  async getProduct(id: number): Promise<Product | undefined> {
    return this.products.get(id);
  }
  
  async getProductByUrl(url: string): Promise<Product | undefined> {
    for (const product of this.products.values()) {
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
      lastChecked: now.toISOString(),
      createdAt: now.toISOString()
    };
    
    this.products.set(id, product);
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
      lastChecked: data.lastChecked || new Date().toISOString()
    };
    
    this.products.set(id, updatedProduct);
    return updatedProduct;
  }
  
  async deleteProduct(id: number): Promise<void> {
    this.products.delete(id);
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
      createdAt: now.toISOString()
    };
    
    this.notifications.set(id, newNotification);
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
  }
}

export const storage = new MemStorage();

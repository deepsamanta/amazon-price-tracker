import { storage } from "../storage";
import { amazonScraper } from "./amazonScraper";
import { calculateDiscountPercentage } from "../../client/src/lib/utils";
import { InsertNotification } from "@shared/schema";
import { log } from "../vite";

class PriceTracker {
  private checkInterval: NodeJS.Timeout | null = null;
  private isChecking: boolean = false;
  
  /**
   * Initialize the price tracker
   */
  initialize(): void {
    // Check prices every 3 hours
    const INTERVAL_HOURS = 3;
    const INTERVAL_MS = INTERVAL_HOURS * 60 * 60 * 1000;
    
    // Schedule the first check
    this.checkInterval = setInterval(() => {
      this.checkPrices();
    }, INTERVAL_MS);
    
    // Do an initial check after a short delay
    setTimeout(() => {
      this.checkPrices();
    }, 30 * 1000); // 30 seconds after startup
    
    log("Price tracker initialized, checking prices every " + INTERVAL_HOURS + " hours", "price-tracker");
  }
  
  /**
   * Check prices for all tracked products
   */
  async checkPrices(): Promise<void> {
    if (this.isChecking) {
      log("Price check already in progress, skipping", "price-tracker");
      return;
    }
    
    this.isChecking = true;
    
    try {
      log("Starting price check for all products", "price-tracker");
      
      const products = await storage.getAllProducts();
      
      if (products.length === 0) {
        log("No products to check", "price-tracker");
        return;
      }
      
      log(`Checking prices for ${products.length} products`, "price-tracker");
      
      for (const product of products) {
        try {
          // Scrape the current price
          const scrapedData = await amazonScraper.scrapeProduct(product.url);
          
          if (!scrapedData) {
            log(`Failed to scrape product ${product.id}: ${product.title}`, "price-tracker");
            continue;
          }
          
          const now = new Date();
          const previousPrice = product.currentPrice;
          const newPrice = scrapedData.currentPrice;
          const originalPrice = Math.max(scrapedData.originalPrice, product.originalPrice);
          
          // Create a new price point
          const pricePoint = {
            date: now.toISOString(),
            price: newPrice
          };
          
          // Add price point to history
          await storage.addPricePoint(product.id, pricePoint);
          
          // Update product with latest data
          await storage.updateProduct(product.id, {
            title: scrapedData.title,
            currentPrice: newPrice,
            originalPrice,
            imageUrl: scrapedData.imageUrl,
            lastChecked: now.toISOString()
          });
          
          // Check if the price has dropped by the threshold percentage
          if (product.notifyOnDrop && previousPrice > newPrice) {
            const previousDropPercentage = calculateDiscountPercentage(previousPrice, originalPrice);
            const currentDropPercentage = calculateDiscountPercentage(newPrice, originalPrice);
            
            // Only notify if the current percentage meets or exceeds the threshold
            // and the previous percentage was below the threshold
            if (currentDropPercentage >= product.dropPercentage && 
                previousDropPercentage < product.dropPercentage) {
              
              const notification: InsertNotification = {
                productId: product.id,
                productName: product.title,
                productUrl: product.url,
                oldPrice: previousPrice,
                newPrice: newPrice,
                percentageDropped: currentDropPercentage,
                read: false
              };
              
              await storage.createNotification(notification);
              log(`Created notification for product ${product.id}: Price dropped by ${currentDropPercentage}%`, "price-tracker");
            }
          }
          
          log(`Updated product ${product.id}: ${product.title}`, "price-tracker");
        } catch (error) {
          log(`Error checking price for product ${product.id}: ${error}`, "price-tracker");
        }
        
        // Add a small delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      log("Price check completed", "price-tracker");
    } catch (error) {
      log(`Error in price checker: ${error}`, "price-tracker");
    } finally {
      this.isChecking = false;
    }
  }
  
  /**
   * Stop the price tracker
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      log("Price tracker stopped", "price-tracker");
    }
  }
}

export const priceTracker = new PriceTracker();

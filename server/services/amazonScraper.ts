import axios from "axios";
import * as cheerio from "cheerio";

interface ScrapedProduct {
  title: string;
  currentPrice: number;
  originalPrice: number;
  imageUrl: string;
}

class AmazonScraper {
  /**
   * Extracts the product ID from either a full Amazon URL or a shortened URL
   */
  private extractProductId(url: string): string | null {
    // For full Amazon URLs
    const fullUrlRegex = /amazon\.in\/(?:[^\/]+\/)?(?:dp|gp\/product)\/([A-Z0-9]{10})/i;
    const fullUrlMatch = url.match(fullUrlRegex);
    
    if (fullUrlMatch && fullUrlMatch[1]) {
      return fullUrlMatch[1];
    }
    
    // For shortened URLs (amzn.in)
    const shortenedUrlRegex = /amzn\.in\/([a-zA-Z0-9]+)/i;
    const shortenedUrlMatch = url.match(shortenedUrlRegex);
    
    if (shortenedUrlMatch && shortenedUrlMatch[1]) {
      return shortenedUrlMatch[1]; // This is actually a redirect code, not a product ID
    }
    
    return null;
  }
  
  /**
   * Resolves a shortened Amazon URL to its full form
   */
  private async resolveShortUrl(shortUrl: string): Promise<string> {
    try {
      const response = await axios.get(shortUrl, {
        maxRedirects: 0,
        validateStatus: (status) => status >= 200 && status < 400
      });
      
      if (response.headers.location) {
        return response.headers.location;
      }
      
      throw new Error("Could not resolve shortened URL");
    } catch (error: any) {
      if (error.response && error.response.headers && error.response.headers.location) {
        return error.response.headers.location;
      }
      throw new Error("Failed to resolve shortened URL");
    }
  }
  
  /**
   * Scrapes product information from Amazon India
   */
  async scrapeProduct(url: string): Promise<ScrapedProduct | null> {
    try {
      let fullUrl = url;
      
      // If it's a shortened URL, resolve it
      if (url.includes("amzn.in")) {
        fullUrl = await this.resolveShortUrl(url);
      }
      
      // Make sure it's an Amazon India URL
      if (!fullUrl.includes("amazon.in")) {
        throw new Error("Not an Amazon India URL");
      }
      
      // Fetch the product page
      const response = await axios.get(fullUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5"
        }
      });
      
      const $ = cheerio.load(response.data);
      
      // Extract product title
      const title = $('#productTitle').text().trim();
      
      if (!title) {
        throw new Error("Could not extract product title");
      }
      
      // Extract current price
      let currentPriceText = $('.priceToPay span.a-price-whole').first().text().trim();
      
      if (!currentPriceText) {
        currentPriceText = $('.a-price-whole').first().text().trim();
      }
      
      // Remove commas and convert to number
      const currentPrice = parseInt(currentPriceText.replace(/[^\d]/g, ""));
      
      if (isNaN(currentPrice)) {
        throw new Error("Could not extract current price");
      }
      
      // Extract original price (MRP)
      let originalPriceText = $('.a-text-price span.a-offscreen').first().text().trim();
      
      if (!originalPriceText) {
        originalPriceText = $('.a-text-strike').first().text().trim();
      }
      
      // Remove currency symbol and commas, then convert to number
      const originalPrice = parseInt(originalPriceText.replace(/[^\d]/g, "")) || currentPrice;
      
      // Extract image URL
      let imageUrl = $('#landingImage').attr('src') || $('#imgBlkFront').attr('src') || '';
      
      if (!imageUrl) {
        const imgData = $('#imageBlock').attr('data-a-dynamic-image');
        if (imgData) {
          try {
            const imgJson = JSON.parse(imgData);
            imageUrl = Object.keys(imgJson)[0];
          } catch (e) {
            // Ignore parsing error and use placeholder
          }
        }
      }
      
      if (!imageUrl) {
        imageUrl = "https://placehold.co/400x300?text=No+Image+Available";
      }
      
      return {
        title,
        currentPrice,
        originalPrice,
        imageUrl
      };
    } catch (error) {
      console.error("Error scraping Amazon product:", error);
      return null;
    }
  }
}

export const amazonScraper = new AmazonScraper();

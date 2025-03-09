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
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Cache-Control": "no-cache",
          "Pragma": "no-cache"
        }
      });
      
      const $ = cheerio.load(response.data);
      console.log("Fetched page HTML length:", response.data.length);
      
      // Extract product title - try multiple selectors
      let title = '';
      const titleSelectors = [
        '#productTitle',
        '.product-title-word-break',
        '.a-size-large.product-title-word-break',
        'h1.a-size-large',
        '[data-feature-name="title"] .a-row'
      ];
      
      for (const selector of titleSelectors) {
        const foundTitle = $(selector).text().trim();
        if (foundTitle) {
          title = foundTitle;
          break;
        }
      }
      
      // If still no title, try to find it in the page's meta tags
      if (!title) {
        title = $('meta[name="title"]').attr('content') || 
               $('meta[property="og:title"]').attr('content') || 
               $('title').text().split(':')[0].trim();
      }
      
      if (!title) {
        console.error("Failed to extract title from page");
        throw new Error("Could not extract product title");
      }
      
      console.log("Extracted title:", title);
      
      // Extract current price - try multiple selectors
      let currentPriceText = '';
      const priceSelectors = [
        '.priceToPay span.a-price-whole', 
        '.a-price .a-price-whole',
        '#priceblock_ourprice',
        '#priceblock_dealprice',
        '.a-price-whole',
        '.a-price .a-offscreen',
        '#corePrice_feature_div .a-price .a-offscreen'
      ];
      
      for (const selector of priceSelectors) {
        const foundPrice = $(selector).first().text().trim();
        if (foundPrice) {
          currentPriceText = foundPrice;
          break;
        }
      }
      
      // Another approach: look for price in the JSON data
      if (!currentPriceText) {
        const priceData = $('script:contains("priceAmount")').text();
        const priceMatches = priceData.match(/"priceAmount":\s*"(\d+[\d,.]*)/);
        if (priceMatches && priceMatches[1]) {
          currentPriceText = priceMatches[1];
        }
      }
      
      // Remove currency symbol, commas and convert to number
      const currentPrice = parseInt(currentPriceText.replace(/[^\d]/g, ""));
      
      if (isNaN(currentPrice)) {
        console.error("Failed to extract current price");
        throw new Error("Could not extract current price");
      }
      
      console.log("Extracted currentPrice:", currentPrice);
      
      // Extract original price (MRP) - try multiple selectors
      let originalPriceText = '';
      const mrpSelectors = [
        '.a-text-price span.a-offscreen', 
        '.a-text-strike',
        '#priceblock_ourprice', 
        '#listPrice', 
        '#priceblock_mrp_row .a-text-strike',
        '.a-price.a-text-price span.a-offscreen',
        '.priceBlockStrikePriceString'
      ];
      
      for (const selector of mrpSelectors) {
        const foundPrice = $(selector).first().text().trim();
        if (foundPrice) {
          originalPriceText = foundPrice;
          break;
        }
      }
      
      // If MRP not found, check for alternative data
      if (!originalPriceText) {
        const mrpData = $('script:contains("listPrice")').text();
        const mrpMatches = mrpData.match(/"listPrice":\s*"(\d+[\d,.]*)/);
        if (mrpMatches && mrpMatches[1]) {
          originalPriceText = mrpMatches[1];
        }
      }
      
      // Remove currency symbol, commas and convert to number
      let originalPrice = parseInt(originalPriceText.replace(/[^\d]/g, ""));
      
      // If we couldn't find the original price, use current price
      if (isNaN(originalPrice)) {
        originalPrice = currentPrice;
      }
      
      console.log("Extracted originalPrice:", originalPrice);
      
      // Extract image URL - try multiple selectors
      let imageUrl = '';
      const imageSelectors = [
        '#landingImage', 
        '#imgBlkFront',
        '#main-image',
        '.a-dynamic-image',
        '.image.maintain-height',
        '.a-spacing-small.item-view-left-col-inner img'
      ];
      
      for (const selector of imageSelectors) {
        const foundSrc = $(selector).attr('src') || $(selector).attr('data-old-hires');
        if (foundSrc) {
          imageUrl = foundSrc;
          break;
        }
      }
      
      // Try to find image in JSON data
      if (!imageUrl) {
        // Try to find in image data
        $('.imgTagWrapper img, #imageBlock img').each((i, el) => {
          if ($(el).attr('data-a-dynamic-image')) {
            try {
              const imgData = $(el).attr('data-a-dynamic-image');
              if (imgData) {
                const imgJson = JSON.parse(imgData);
                imageUrl = Object.keys(imgJson)[0];
              }
            } catch (e) {
              // Ignore parsing error
            }
          }
        });
        
        // Check meta tags
        if (!imageUrl) {
          imageUrl = $('meta[property="og:image"]').attr('content') || '';
        }
      }
      
      // If still no image, use a placeholder
      if (!imageUrl) {
        imageUrl = "https://placehold.co/400x300?text=No+Image+Available";
      }
      
      console.log("Extracted imageUrl:", imageUrl);
      
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

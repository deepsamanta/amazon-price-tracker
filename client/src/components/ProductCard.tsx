import { useState } from "react";
import { X, ExternalLink } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatTimeAgo, formatCurrency, calculateDiscountPercentage, shortenText } from "@/lib/utils";
import { Product } from "@shared/schema";
import PriceHistoryChart from "./PriceHistoryChart";

type ProductCardProps = {
  product: Product;
  onRemove: () => void;
};

export default function ProductCard({ product, onRemove }: ProductCardProps) {
  const [showPriceHistory, setShowPriceHistory] = useState(false);
  const { toast } = useToast();
  
  const discountPercentage = calculateDiscountPercentage(product.currentPrice, product.originalPrice);
  const isPriceDrop = discountPercentage >= 60;

  const { mutate: removeProduct, isPending } = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/products/${product.id}`);
    },
    onSuccess: () => {
      toast({
        title: "Product removed",
        description: "The product has been removed from your tracking list",
      });
      onRemove();
    },
    onError: (error) => {
      toast({
        title: "Error removing product",
        description: error instanceof Error ? error.message : "Failed to remove product",
        variant: "destructive",
      });
    },
  });

  const togglePriceHistory = () => {
    setShowPriceHistory(!showPriceHistory);
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="relative">
        <img 
          src={product.imageUrl} 
          alt={product.title} 
          className="w-full h-48 object-contain bg-white p-2"
          onError={(e) => {
            e.currentTarget.src = "https://placehold.co/400x300?text=No+Image+Available";
          }}
        />
        <div className="absolute top-0 right-0 mt-2 mr-2">
          <button 
            className="bg-white text-gray-600 rounded-full p-1 shadow-md hover:bg-gray-100 focus:outline-none"
            onClick={() => removeProduct()}
            disabled={isPending}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {discountPercentage > 0 && (
          <div className="absolute bottom-0 left-0 mb-2 ml-2">
            <span className={`${isPriceDrop ? 'bg-green-500' : 'bg-yellow-500'} text-white text-xs px-2 py-1 rounded-full font-semibold`}>
              -{discountPercentage}%
            </span>
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-medium text-gray-900 truncate" title={product.title}>
          {shortenText(product.title, 70)}
        </h3>
        
        <div className="mt-2 flex items-baseline">
          <span className="text-primary-600 font-semibold text-lg">
            {formatCurrency(product.currentPrice)}
          </span>
          {product.originalPrice > product.currentPrice && (
            <span className="text-gray-500 text-sm line-through ml-2">
              {formatCurrency(product.originalPrice)}
            </span>
          )}
        </div>

        <div className="mt-3 border-t border-gray-100 pt-3">
          <div className="text-xs text-gray-500 mb-1">
            Last checked: {formatTimeAgo(new Date(product.lastChecked))}
          </div>
          <div className="flex justify-between items-center">
            <button 
              className="text-primary-500 text-sm hover:underline"
              onClick={togglePriceHistory}
            >
              Price History
            </button>
            <a 
              href={product.url} 
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#F97316] text-sm hover:underline flex items-center"
            >
              View on Amazon
              <ExternalLink className="h-3 w-3 ml-1" />
            </a>
          </div>
        </div>

        {showPriceHistory && (
          <div className="mt-4">
            <PriceHistoryChart 
              history={product.priceHistory} 
              productId={product.id}
            />
          </div>
        )}
      </div>
    </div>
  );
}

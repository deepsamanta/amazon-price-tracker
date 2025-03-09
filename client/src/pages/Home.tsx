import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TrendingDown } from "lucide-react";
import AddProductForm from "@/components/AddProductForm";
import NotificationPanel from "@/components/NotificationPanel";
import ProductCard from "@/components/ProductCard";
import EmptyState from "@/components/EmptyState";
import { Product, Notification } from "@shared/schema";

export default function Home() {
  const [filter, setFilter] = useState<"all" | "dropped" | "recent">("all");
  
  const { data: products = [], isLoading: productsLoading, refetch: refetchProducts } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });
  
  const { data: notifications = [], isLoading: notificationsLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
  });

  const filteredProducts = (() => {
    switch (filter) {
      case "dropped":
        return products.filter(p => 
          p.currentPrice && p.originalPrice && 
          ((p.originalPrice - p.currentPrice) / p.originalPrice) >= 0.6
        );
      case "recent":
        return [...products].sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      default:
        return products;
    }
  })();

  const showEmptyState = !productsLoading && products.length === 0;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="bg-primary-500 text-white shadow-md">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <TrendingDown className="mr-2 h-5 w-5" />
            <h1 className="text-xl font-bold">Amazon Price Tracker</h1>
          </div>
          <div className="flex items-center">
            <span className="material-icons mr-1">notifications</span>
            <span className="bg-[#F97316] text-xs px-1.5 py-0.5 rounded-full">
              {notifications.length}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-4 py-6">
        <AddProductForm onProductAdded={refetchProducts} />
        
        {notifications.length > 0 && (
          <NotificationPanel notifications={notifications} />
        )}

        {!showEmptyState && (
          <section className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Products You're Tracking</h2>
              <div>
                <select 
                  className="bg-white border border-gray-300 rounded-md text-sm text-gray-700 h-8 px-2 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-500"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as any)}
                >
                  <option value="all">All Products</option>
                  <option value="dropped">Price Dropped</option>
                  <option value="recent">Recently Added</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  onRemove={refetchProducts} 
                />
              ))}
            </div>
          </section>
        )}

        {showEmptyState && <EmptyState />}
      </main>

      {/* Footer */}
      <footer className="bg-gray-100 py-4 border-t border-gray-200">
        <div className="container mx-auto px-4 text-center text-sm text-gray-600">
          <p>Amazon Price Tracker is not affiliated with Amazon Inc.</p>
          <p className="mt-1">We check prices automatically every few hours.</p>
        </div>
      </footer>
    </div>
  );
}

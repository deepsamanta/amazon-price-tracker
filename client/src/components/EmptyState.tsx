import { ShoppingCart, HelpCircle } from "lucide-react";

export default function EmptyState() {
  return (
    <section className="py-12 text-center">
      <div className="inline-flex justify-center items-center w-24 h-24 rounded-full bg-primary-100 mb-6">
        <ShoppingCart className="h-10 w-10 text-primary-500" />
      </div>
      <h2 className="text-xl font-semibold text-gray-800 mb-2">No products tracked yet</h2>
      <p className="text-gray-600 mb-4 max-w-md mx-auto">
        Add your first Amazon product by pasting a link above to start tracking price drops.
      </p>
      <button className="text-primary-500 font-medium hover:underline flex items-center justify-center mx-auto">
        <HelpCircle className="h-4 w-4 mr-1" />
        How it works
      </button>
    </section>
  );
}

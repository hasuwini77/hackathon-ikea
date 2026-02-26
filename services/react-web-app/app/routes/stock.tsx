import { StockItem } from "~/components/StockItem";

export function meta() {
  return [
    { title: "Airport Stock Counter" },
    { name: "description", content: "Flight attendant stock management" },
  ];
}

const ITEMS = [
  { id: "water", name: "Water", image: "https://images.unsplash.com/photo-1564419320461-6870880221ad?w=400&q=80" },
  { id: "soda", name: "Soda", image: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&q=80" },
  { id: "chips", name: "Chips", image: "https://images.unsplash.com/photo-1613919113640-25732ec5e61f?w=400&q=80" },
  { id: "sandwich", name: "Sandwich", image: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&q=80" },
  { id: "coffee", name: "Coffee", image: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&q=80" },
  { id: "tea", name: "Tea", image: "https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?w=400&q=80" },
];

export default function CounterPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            In-Flight Stock Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage inventory for flight #1234
          </p>
        </header>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4 md:gap-6">
          {ITEMS.map((item) => (
            <StockItem 
              key={item.id}
              id={item.id}
              name={item.name}
              image={item.image}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

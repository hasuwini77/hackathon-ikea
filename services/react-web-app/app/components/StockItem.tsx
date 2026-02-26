import { useState, useEffect } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Loader2, Plus, Minus } from "lucide-react";

interface StockDoc {
  _id: string;
  _rev?: string;
  count: number;
}

interface StockItemProps {
  id: string;
  name: string;
  image: string;
}

export function StockItem({ id, name, image }: StockItemProps) {
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rev, setRev] = useState<string | undefined>(undefined);

  const docId = `item:${id}`;

  const fetchCount = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/couchbase/main/${docId}`);
      
      if (response.status === 404) {
        // Document doesn't exist, initialize it
        setCount(0);
        setRev(undefined);
      } else if (response.ok) {
        const data: StockDoc = await response.json();
        setCount(data.count);
        setRev(data._rev);
      } else {
        throw new Error(`Failed to fetch ${name}: ${response.statusText}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const updateCount = async (newCount: number) => {
    if (newCount < 0) return; // Prevent negative stock
    
    try {
      setLoading(true);
      const body = { count: newCount, _rev: rev };
      
      const response = await fetch(`/api/couchbase/main/${docId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const data = await response.json();
        setCount(newCount);
        setRev(data.rev);
      } else {
        throw new Error(`Failed to update ${name}: ${response.statusText}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      fetchCount(); // Refresh on error/conflict
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCount();
  }, [id]);

  return (
    <Card className="w-full overflow-hidden hover:shadow-lg transition-shadow h-full flex flex-col">
      <div className="h-48 relative bg-gray-100 dark:bg-gray-800 shrink-0">
        <img 
          src={image} 
          alt={name}
          className="w-full h-full object-cover"
          onError={(e) => {
            // Fallback if image fails
            (e.target as HTMLImageElement).src = `https://placehold.co/400x400?text=${name}`;
          }}
        />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
        )}
      </div>
      
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-lg font-semibold text-center">{name}</CardTitle>
      </CardHeader>
      
      <CardContent className="p-4 pt-0">
        {error ? (
          <div className="text-red-500 text-xs text-center mb-2">
            {error}
            <button onClick={fetchCount} className="underline ml-1">Retry</button>
          </div>
        ) : null}
        
        <div className="flex items-center justify-between gap-2 bg-gray-50 dark:bg-gray-900 p-2 rounded-lg">
          <Button 
            variant="outline" 
            size="icon"
            className="h-8 w-8"
            onClick={() => updateCount((count || 0) - 1)}
            disabled={loading || (count || 0) <= 0}
          >
            <Minus className="h-4 w-4" />
          </Button>
          
          <span className="text-xl font-bold min-w-[2ch] text-center">
            {count !== null ? count : "-"}
          </span>
          
          <Button 
            variant="outline" 
            size="icon"
            className="h-8 w-8"
            onClick={() => updateCount((count || 0) + 1)}
            disabled={loading}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

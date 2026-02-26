import { useState, useEffect } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Loader2 } from "lucide-react";

interface CounterDoc {
  _id: string;
  _rev?: string;
  count: number;
}

export function Counter() {
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rev, setRev] = useState<string | undefined>(undefined);

  const fetchCount = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/couchbase/main/counter");
      
      if (response.status === 404) {
        // Document doesn't exist, initialize it
        setCount(0);
        setRev(undefined);
      } else if (response.ok) {
        const data: CounterDoc = await response.json();
        setCount(data.count);
        setRev(data._rev);
      } else {
        throw new Error(`Failed to fetch counter: ${response.statusText}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const updateCount = async (newCount: number) => {
    try {
      setLoading(true);
      const body = { count: newCount, _rev: rev };
      
      const response = await fetch("/api/couchbase/main/counter", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const data = await response.json();
        setCount(newCount);
        setRev(data.rev); // Couchbase returns the new rev in the response
      } else {
        throw new Error(`Failed to update counter: ${response.statusText}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      // Refresh to get the latest state in case of conflict
      fetchCount();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCount();
  }, []);

  if (loading && count === null) {
    return (
      <div className="flex justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 p-4">
        Error: {error}
        <Button variant="outline" size="sm" onClick={fetchCount} className="ml-2">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <Card className="w-full max-w-sm mx-auto mt-4">
      <CardHeader>
        <CardTitle className="text-center">Couchbase Counter</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <div className="text-4xl font-bold">{count}</div>
        <div className="flex gap-2">
          <Button 
            onClick={() => updateCount((count || 0) - 1)}
            disabled={loading}
          >
            Decrement
          </Button>
          <Button 
            onClick={() => updateCount((count || 0) + 1)}
            disabled={loading}
          >
            Increment
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

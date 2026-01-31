import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Headphones, Loader2 } from 'lucide-react';

interface CustomerIdEntryProps {
  onSubmit: (customerId: string) => Promise<boolean>;
}

export function CustomerIdEntry({ onSubmit }: CustomerIdEntryProps) {
  const [customerId, setCustomerId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customerId.trim()) {
      setError('Please enter your Customer ID');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const isValid = await onSubmit(customerId.trim().toUpperCase());
      if (!isValid) {
        setError('Customer ID not found. Please check and try again.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Headphones className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Customer Support</CardTitle>
          <CardDescription>
            Enter your Customer ID to start a conversation with our AI support agent
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="text"
                placeholder="Enter Customer ID (e.g., C0001)"
                value={customerId}
                onChange={(e) => {
                  setCustomerId(e.target.value);
                  setError('');
                }}
                className="text-center text-lg uppercase"
                disabled={isLoading}
              />
              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}
            </div>
            <Button 
              type="submit" 
              className="w-full" 
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Start Conversation'
              )}
            </Button>
          </form>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Your Customer ID can be found in your order confirmation email
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

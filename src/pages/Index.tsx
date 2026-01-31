import { useState, useCallback } from 'react';
import { CustomerIdEntry } from '@/components/CustomerIdEntry';
import { SupportInterface } from '@/components/SupportInterface';

const Index = () => {
  const [customerId, setCustomerId] = useState<string | null>(null);

  const handleValidateCustomer = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/customer-support`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          action: 'validateCustomer',
          context: { customerId: id }
        })
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      if (data.valid) {
        setCustomerId(id);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Validation error:', error);
      return false;
    }
  }, []);

  const handleLogout = useCallback(() => {
    setCustomerId(null);
  }, []);

  if (!customerId) {
    return <CustomerIdEntry onSubmit={handleValidateCustomer} />;
  }

  return <SupportInterface customerId={customerId} onLogout={handleLogout} />;
};

export default Index;

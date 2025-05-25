"use client";

import { useState } from 'react';
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Loader2 } from "lucide-react";

interface MarginfiAccount {
  address: string;
  authority: string;
  // Add more fields as needed
}

export function MarginfiAccounts() {
  const [walletAddress, setWalletAddress] = useState('');
  const [accounts, setAccounts] = useState<MarginfiAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAccounts = async () => {
    if (!walletAddress) {
      setError('Please enter a wallet address');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/marginfi/accounts?wallet=${walletAddress}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch accounts');
      }

      setAccounts(data.accounts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch accounts');
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>MarginFi Accounts</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 mb-4">
          <Input
            placeholder="Enter wallet address"
            value={walletAddress}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWalletAddress(e.target.value)}
            className="flex-1"
          />
          <Button 
            onClick={fetchAccounts}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              'Search'
            )}
          </Button>
        </div>

        {error && (
          <div className="text-red-500 mb-4">
            {error}
          </div>
        )}

        {accounts.length > 0 ? (
          <div className="space-y-4">
            {accounts.map((account) => (
              <Card key={account.address}>
                <CardContent className="pt-6">
                  <div className="grid gap-2">
                    <div>
                      <span className="font-semibold">Account Address:</span>
                      <span className="ml-2 font-mono">{account.address}</span>
                    </div>
                    <div>
                      <span className="font-semibold">Authority:</span>
                      <span className="ml-2 font-mono">{account.authority}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !loading && !error && (
          <div className="text-center text-muted-foreground">
            No accounts found. Enter a wallet address to search.
          </div>
        )}
      </CardContent>
    </Card>
  );
} 
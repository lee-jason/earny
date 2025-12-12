"use client";

import { useEffect, useState } from "react";

export function BalanceDisplay() {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBalance = async () => {
    try {
      const res = await fetch("/api/balance");
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance);
      }
    } catch (error) {
      console.error("Failed to fetch balance:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, []);

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white animate-pulse">
        <div className="h-4 bg-white/20 rounded w-24 mb-2" />
        <div className="h-10 bg-white/20 rounded w-32" />
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white">
      <p className="text-sm opacity-80">Your Balance</p>
      <p className="text-4xl font-bold mt-1">
        {balance?.toLocaleString() ?? 0} credits
      </p>
      <p className="text-xs opacity-60 mt-2">
        Earn credits through fitness activities
      </p>
    </div>
  );
}

export function useBalance() {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBalance = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/balance");
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance);
      }
    } catch (error) {
      console.error("Failed to fetch balance:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, []);

  return { balance, loading, refetch: fetchBalance };
}

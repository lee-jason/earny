"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { TransactionList } from "@/components/TransactionList";

type FilterType = "all" | "EARNING" | "SPENDING";

export default function LedgerPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [filter, setFilter] = useState<FilterType>("all");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transaction Ledger</h1>
          <p className="text-gray-600">
            View your complete transaction history
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === "all"
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("EARNING")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === "EARNING"
                ? "bg-green-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Earnings
          </button>
          <button
            onClick={() => setFilter("SPENDING")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === "SPENDING"
                ? "bg-red-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Spending
          </button>
        </div>
      </div>

      <TransactionList
        key={filter}
        filterType={filter === "all" ? null : filter}
      />
    </div>
  );
}

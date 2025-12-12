"use client";

import { useEffect, useState } from "react";

interface Transaction {
  id: string;
  type: "EARNING" | "SPENDING";
  activityType: string | null;
  amount: number;
  description: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface TransactionListProps {
  filterType?: "EARNING" | "SPENDING" | null;
}

export function TransactionList({ filterType = null }: TransactionListProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchTransactions = async (page: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });
      if (filterType) {
        params.set("type", filterType);
      }

      const res = await fetch(`/api/transactions?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions(currentPage);
  }, [currentPage, filterType]);

  if (loading && transactions.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 text-center">
        <p className="text-gray-500">No transactions yet</p>
        <p className="text-sm text-gray-400 mt-1">
          Start logging activities to see your transaction history
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {transactions.map((tx) => (
              <tr key={tx.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(tx.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      tx.type === "EARNING"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {tx.type === "EARNING" ? "Earned" : "Spent"}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {tx.description || tx.activityType || "—"}
                </td>
                <td
                  className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-right ${
                    tx.amount > 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {tx.amount > 0 ? "+" : ""}
                  {tx.amount.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="bg-gray-50 px-6 py-3 flex items-center justify-between border-t">
          <p className="text-sm text-gray-500">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total}{" "}
            total)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border rounded hover:bg-gray-100 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() =>
                setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))
              }
              disabled={currentPage === pagination.totalPages}
              className="px-3 py-1 text-sm border rounded hover:bg-gray-100 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

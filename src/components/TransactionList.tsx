"use client";

import { useEffect, useState, useMemo } from "react";

interface Transaction {
  id: string;
  type: "EARNING" | "SPENDING";
  activityType: string | null;
  amount: number;
  description: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

interface CollapsedTransaction {
  ids: string[];
  type: "EARNING" | "SPENDING";
  totalAmount: number;
  descriptions: string[];
  startTime: string;
  endTime: string;
  count: number;
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

// Collapse sequential spending transactions into single rows
function collapseTransactions(transactions: Transaction[]): (Transaction | CollapsedTransaction)[] {
  const result: (Transaction | CollapsedTransaction)[] = [];
  let i = 0;

  while (i < transactions.length) {
    const current = transactions[i];

    // If it's a spending transaction, look for consecutive spending transactions
    if (current.type === "SPENDING") {
      const spendingGroup: Transaction[] = [current];

      // Collect all consecutive spending transactions
      while (
        i + 1 < transactions.length &&
        transactions[i + 1].type === "SPENDING"
      ) {
        i++;
        spendingGroup.push(transactions[i]);
      }

      // If we have multiple spending transactions, collapse them
      if (spendingGroup.length > 1) {
        // Get unique descriptions
        const uniqueDescriptions = [...new Set(
          spendingGroup
            .map(tx => {
              // Extract video title from description like "YouTube: Video Title (1 min)"
              const match = tx.description?.match(/^(YouTube|Twitch): (.+?) \(\d+ min\)$/);
              return match ? match[2] : tx.description || tx.activityType || "Video";
            })
            .filter(Boolean)
        )];

        result.push({
          ids: spendingGroup.map(tx => tx.id),
          type: "SPENDING",
          totalAmount: spendingGroup.reduce((sum, tx) => sum + tx.amount, 0),
          descriptions: uniqueDescriptions as string[],
          startTime: spendingGroup[spendingGroup.length - 1].createdAt, // Oldest
          endTime: spendingGroup[0].createdAt, // Most recent
          count: spendingGroup.length,
        });
      } else {
        // Single spending transaction, add as-is
        result.push(current);
      }
    } else {
      // Earning transactions are not collapsed
      result.push(current);
    }

    i++;
  }

  return result;
}

function isCollapsed(tx: Transaction | CollapsedTransaction): tx is CollapsedTransaction {
  return "ids" in tx;
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

  // Collapse sequential spending transactions
  const displayTransactions = useMemo(
    () => collapseTransactions(transactions),
    [transactions]
  );

  if (loading && transactions.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 dark:bg-gray-700 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 text-center">
        <p className="text-gray-500 dark:text-gray-400">No transactions yet</p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
          Start logging activities to see your transaction history
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Amount
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {displayTransactions.map((tx) => {
              if (isCollapsed(tx)) {
                // Collapsed spending transaction
                return (
                  <tr key={tx.ids[0]} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      <div>
                        {new Date(tx.endTime).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">
                        {tx.count} min session
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
                        Spent
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                      <div className="max-w-md">
                        {tx.descriptions.slice(0, 3).map((desc, i) => (
                          <span key={i}>
                            {i > 0 && ", "}
                            <span className="truncate">{desc}</span>
                          </span>
                        ))}
                        {tx.descriptions.length > 3 && (
                          <span className="text-gray-500 dark:text-gray-400">
                            {" "}+{tx.descriptions.length - 3} more
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right text-red-600 dark:text-red-400">
                      {tx.totalAmount.toLocaleString()}
                    </td>
                  </tr>
                );
              } else {
                // Regular transaction
                return (
                  <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
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
                            ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                            : "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300"
                        }`}
                      >
                        {tx.type === "EARNING" ? "Earned" : "Spent"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                      {tx.description || tx.activityType || "—"}
                    </td>
                    <td
                      className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-right ${
                        tx.amount > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {tx.amount > 0 ? "+" : ""}
                      {tx.amount.toLocaleString()}
                    </td>
                  </tr>
                );
              }
            })}
          </tbody>
        </table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="bg-gray-50 dark:bg-gray-700 px-6 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-600">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total}{" "}
            total)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() =>
                setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))
              }
              disabled={currentPage === pagination.totalPages}
              className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

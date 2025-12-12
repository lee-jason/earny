"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BalanceDisplay } from "@/components/BalanceDisplay";
import { ActivityLogger } from "@/components/ActivityLogger";
import { TransactionList } from "@/components/TransactionList";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [refreshKey, setRefreshKey] = useState(0);

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

  const handleActivitySuccess = () => {
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {session.user?.name?.split(" ")[0] || "there"}!
        </h1>
        <p className="text-gray-600">
          Track your activities and earn credits
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <BalanceDisplay key={`balance-${refreshKey}`} />
          <ActivityLogger onSuccess={handleActivitySuccess} />
        </div>

        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
          <TransactionList key={`transactions-${refreshKey}`} />
        </div>
      </div>
    </div>
  );
}

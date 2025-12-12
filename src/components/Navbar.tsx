"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";

export function Navbar() {
  const { data: session, status } = useSession();

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-indigo-600">
              Earny
            </Link>
            {session && (
              <div className="ml-10 flex items-center space-x-4">
                <Link
                  href="/dashboard"
                  className="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Dashboard
                </Link>
                <Link
                  href="/ledger"
                  className="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Ledger
                </Link>
              </div>
            )}
          </div>
          <div className="flex items-center">
            {status === "loading" ? (
              <div className="h-8 w-8 animate-pulse bg-gray-200 rounded-full" />
            ) : session ? (
              <div className="flex items-center space-x-4">
                {session.user?.image && (
                  <Image
                    src={session.user.image}
                    alt={session.user.name ?? "User"}
                    width={32}
                    height={32}
                    className="rounded-full"
                  />
                )}
                <span className="text-sm text-gray-700">
                  {session.user?.name}
                </span>
                <button
                  onClick={() => signOut()}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

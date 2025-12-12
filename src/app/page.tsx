import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4">
      <div className="max-w-2xl text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          Earn Your Screen Time
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Log your fitness activities to earn credits. Spend them watching
          videos on YouTube and Twitch. Stay fit, stay entertained.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/login"
            className="bg-indigo-600 text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            Get Started
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-8">
          <div className="p-6">
            <div className="text-4xl mb-4">🏃</div>
            <h3 className="text-lg font-semibold mb-2">Log Activities</h3>
            <p className="text-gray-600 text-sm">
              Track gym sessions, runs, walks, and bike rides
            </p>
          </div>
          <div className="p-6">
            <div className="text-4xl mb-4">💰</div>
            <h3 className="text-lg font-semibold mb-2">Earn Credits</h3>
            <p className="text-gray-600 text-sm">
              Each activity earns you credits based on duration or distance
            </p>
          </div>
          <div className="p-6">
            <div className="text-4xl mb-4">📺</div>
            <h3 className="text-lg font-semibold mb-2">Watch Videos</h3>
            <p className="text-gray-600 text-sm">
              Spend credits to watch YouTube and Twitch using our browser
              extension
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

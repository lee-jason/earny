import Link from "next/link";

export default function DownloadPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          Download Extension
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mb-8">
          Install the Earny browser extension to track your video watching time
          and spend your fitness credits.
        </p>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Firefox */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z"
                  fill="#FF7139"
                />
                <path
                  d="M20.5 12c0-.5-.05-1-.14-1.47-.13-.67-.35-1.3-.65-1.9-.15.45-.4.85-.7 1.17-.35.35-.75.6-1.2.75.1.47.15.95.15 1.45 0 3.31-2.69 6-6 6s-6-2.69-6-6c0-.5.05-1 .15-1.45-.45-.15-.85-.4-1.2-.75-.3-.32-.55-.72-.7-1.17-.3.6-.52 1.23-.65 1.9-.09.47-.14.97-.14 1.47 0 4.69 3.81 8.5 8.5 8.5s8.5-3.81 8.5-8.5z"
                  fill="#FF3F00"
                />
              </svg>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Firefox
              </h2>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              For Firefox browser. Requires Firefox 109 or later.
            </p>
            <a
              href="/extensions/earny-firefox.xpi"
              className="inline-block w-full text-center bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              Download for Firefox
            </a>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-3">
              Note: For permanent installation, the extension must be{" "}
              <a
                href="https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                signed by Mozilla
              </a>
              .
            </p>
          </div>

          {/* Chrome */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" fill="#4285F4" />
                <circle cx="12" cy="12" r="4" fill="white" />
                <path d="M12 2v6l5.2-3L12 2z" fill="#EA4335" />
                <path d="M12 2L6.8 5l5.2 3V2z" fill="#FBBC05" />
                <path d="M2 12h6l-3-5.2L2 12z" fill="#EA4335" />
                <path d="M2 12l3 5.2 3-5.2H2z" fill="#34A853" />
                <path d="M12 22v-6l-5.2 3L12 22z" fill="#34A853" />
                <path d="M12 22l5.2-3-5.2-3v6z" fill="#4285F4" />
                <path d="M22 12h-6l3 5.2L22 12z" fill="#4285F4" />
                <path d="M22 12l-3-5.2-3 5.2h6z" fill="#FBBC05" />
              </svg>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Chrome
              </h2>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              For Chrome, Edge, Brave, and other Chromium browsers.
            </p>
            <a
              href="/extensions/earny-chrome.zip"
              className="inline-block w-full text-center bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              Download for Chrome
            </a>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-3">
              Unzip and load via chrome://extensions with Developer Mode enabled.
            </p>
          </div>
        </div>

        <div className="mt-12 p-6 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Installation Instructions
          </h3>
          <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Firefox:</h4>
              <ol className="list-decimal list-inside ml-2 mt-1 space-y-1">
                <li>Click the download button above</li>
                <li>Firefox will prompt you to install the extension</li>
                <li>Click &quot;Add&quot; to complete installation</li>
              </ol>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Chrome:</h4>
              <ol className="list-decimal list-inside ml-2 mt-1 space-y-1">
                <li>Download and unzip the file</li>
                <li>Go to <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">chrome://extensions</code></li>
                <li>Enable &quot;Developer mode&quot; in the top right</li>
                <li>Click &quot;Load unpacked&quot; and select the unzipped folder</li>
              </ol>
            </div>
          </div>
        </div>

        <p className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          By installing, you agree to our{" "}
          <Link href="/privacy" className="text-indigo-600 dark:text-indigo-400 hover:underline">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}

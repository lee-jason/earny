export default function PrivacyPolicy() {
  return (
    <div className="min-h-[calc(100vh-4rem)] py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
          Privacy Policy
        </h1>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-6 text-gray-600 dark:text-gray-300">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
              Overview
            </h2>
            <p>
              Earny is a fitness credit tracking application that rewards physical activity
              with screen time. This privacy policy explains how we collect, use, and protect
              your information when you use our web application and browser extension.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
              Information We Collect
            </h2>
            <h3 className="text-xl font-medium text-gray-800 dark:text-gray-200 mt-6 mb-3">
              Account Information
            </h3>
            <p>
              When you sign in with Google OAuth, we receive your name, email address, and
              profile picture from Google. We use this information to create and manage your account.
            </p>

            <h3 className="text-xl font-medium text-gray-800 dark:text-gray-200 mt-6 mb-3">
              Activity Data
            </h3>
            <p>
              We store the fitness activities you log (type, duration, distance) and your
              credit balance. This data is necessary to provide the core functionality of the app.
            </p>

            <h3 className="text-xl font-medium text-gray-800 dark:text-gray-200 mt-6 mb-3">
              Browser Extension Data
            </h3>
            <p>
              The browser extension tracks video playback time on YouTube and Twitch to deduct
              credits. We store the duration of video watching sessions and basic video metadata
              (URL, title) for your transaction history. The extension does not track your
              browsing history on other websites.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
              How We Use Your Information
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>To provide and maintain the Earny service</li>
              <li>To track your credit balance and transaction history</li>
              <li>To authenticate your identity across the web app and browser extension</li>
              <li>To improve and optimize our service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
              Data Storage and Security
            </h2>
            <p>
              Your data is stored securely in our database. We use industry-standard security
              measures to protect your information. Authentication is handled through secure
              session tokens.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
              Third-Party Services
            </h2>
            <p>
              We use Google OAuth for authentication. When you sign in, you are subject to
              Google&apos;s privacy policy. We do not sell or share your personal information
              with third parties for marketing purposes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
              Your Rights
            </h2>
            <p>
              You can request deletion of your account and associated data at any time by
              contacting us. Upon deletion, all your personal information, activity logs,
              and transaction history will be permanently removed.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
              Browser Extension Permissions
            </h2>
            <p>The Earny browser extension requires the following permissions:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li><strong>Storage:</strong> To save session data locally for crash recovery</li>
              <li><strong>Tabs:</strong> To detect which tabs are playing videos</li>
              <li><strong>Alarms:</strong> To track video watching duration</li>
              <li><strong>Cookies:</strong> To authenticate with your Earny account</li>
              <li><strong>YouTube/Twitch access:</strong> To detect video playback on these sites</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
              Changes to This Policy
            </h2>
            <p>
              We may update this privacy policy from time to time. We will notify users of
              any material changes by updating the date at the top of this policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
              Contact
            </h2>
            <p>
              If you have any questions about this privacy policy, please contact us at{" "}
              <a href="mailto:privacy@earny.app" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                privacy@earny.app
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

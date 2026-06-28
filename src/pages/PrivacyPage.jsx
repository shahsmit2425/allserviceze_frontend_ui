import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-transparent" data-theme="customer">
      <header className="sticky top-0 z-10 border-b border-white/60 bg-white backdrop-blur-xl">
        <div className="page-shell py-4">
          <Link to="/" className="inline-flex items-center gap-2 rounded-lg border border-deep-navy-100/80 bg-white px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
        </div>
      </header>

      <main className="page-shell space-y-8 py-8">
        <section className="page-hero">
          <span className="page-kicker">Legal</span>
          <h1 className="heading-2 mt-4 text-foreground">Privacy Policy</h1>
          <p className="body-lg mt-3 text-muted-foreground">Last updated: April 26, 2026</p>
        </section>

        <section className="rounded-xl border border-white/70 bg-white/88 p-6 shadow-xl shadow-deep-navy-800/5 backdrop-blur-sm sm:p-8">
        <div className="prose prose-slate max-w-none space-y-8">

          <section>
            <h2 className="font-heading font-semibold text-2xl mb-3">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              ServiceTones, Inc. ("ServiceTones", "we", "us", or "our") operates the ServiceTones platform —
              a marketplace connecting customers with home-service professionals. This Privacy Policy explains
              how we collect, use, disclose, and protect your personal information when you use our website,
              mobile application, or any related services (collectively, the "Platform").
            </p>
            <p className="text-muted-foreground leading-relaxed mt-2">
              By accessing or using the Platform, you agree to this Privacy Policy. If you do not agree,
              please discontinue use immediately.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-semibold text-2xl mb-3">2. Information We Collect</h2>
            <h3 className="font-semibold text-lg mb-2">2.1 Information You Provide</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 leading-relaxed">
              <li><strong>Account registration:</strong> name, email address, phone number, and password.</li>
              <li><strong>Provider profiles:</strong> business name, service description, address, service areas, certifications, licenses, and portfolio photos.</li>
              <li><strong>Booking and project details:</strong> service type, location, scheduling preferences, and descriptions.</li>
              <li><strong>Payment information:</strong> processed by Stripe; ServiceTones does not store full card numbers.</li>
              <li><strong>Identity verification:</strong> government-issued ID documents submitted through Stripe Identity (providers only).</li>
              <li><strong>Communications:</strong> messages sent between customers and providers through the platform.</li>
            </ul>

            <h3 className="font-semibold text-lg mb-2 mt-4">2.2 Information Collected Automatically</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 leading-relaxed">
              <li><strong>Device and usage data:</strong> IP address, browser type, operating system, pages visited, time spent, and referring URLs.</li>
              <li><strong>Location data:</strong> approximate location derived from your IP address; precise location only if you grant permission.</li>
              <li><strong>Cookies and similar technologies:</strong> session authentication cookies (httpOnly, secure) and analytics trackers.</li>
            </ul>

            <h3 className="font-semibold text-lg mb-2 mt-4">2.3 Information from Third Parties</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 leading-relaxed">
              <li><strong>Social sign-in (Sign in with Apple, Google):</strong> If you use a social sign-in option, we receive your email address and name from that provider solely to create or link your account.</li>
              <li><strong>Background check partners:</strong> Results of background or identity checks (providers only).</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading font-semibold text-2xl mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 leading-relaxed">
              <li>Creating and managing your account.</li>
              <li>Connecting customers with service providers.</li>
              <li>Processing payments and payouts.</li>
              <li>Sending booking confirmations, receipts, and service-related notifications.</li>
              <li>Verifying provider identities and credentials.</li>
              <li>Providing customer support and resolving disputes.</li>
              <li>Improving platform safety, security, and reliability.</li>
              <li>Complying with legal obligations.</li>
              <li>Sending optional marketing communications (only with your consent; unsubscribe at any time).</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading font-semibold text-2xl mb-3">4. Sharing Your Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              We do not sell your personal information. We share data only in the following limited circumstances:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 leading-relaxed mt-2">
              <li><strong>Between customers and providers:</strong> Contact details (name, approximate location) are shared to facilitate booked services.</li>
              <li><strong>Service providers (processors):</strong> AWS (infrastructure), Stripe (payments and identity), Daily.co (video calls), and analytics partners — all under data processing agreements.</li>
              <li><strong>Legal requirements:</strong> When required by law, court order, or valid governmental request.</li>
              <li><strong>Business transfers:</strong> In connection with a merger, acquisition, or sale of assets, where your data would be transferred under equivalent protections.</li>
              <li><strong>Safety:</strong> To prevent imminent harm to any person.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading font-semibold text-2xl mb-3">5. Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use strictly necessary cookies (e.g., secure httpOnly session cookie) to authenticate your session.
              We do not use third-party advertising cookies. You may configure your browser to reject cookies,
              but doing so will prevent you from logging in.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-semibold text-2xl mb-3">6. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain your account data for as long as your account is active. After account deletion,
              we retain a minimal anonymized record for up to 90 days to resolve disputes and comply with
              legal obligations, then permanently delete it. Transaction records (bookings, payments) may
              be retained for up to 7 years as required by financial regulations.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-semibold text-2xl mb-3">7. Your Rights and Choices</h2>
            <p className="text-muted-foreground leading-relaxed">Depending on your location, you may have the right to:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 leading-relaxed mt-2">
              <li><strong>Access</strong> personal data we hold about you.</li>
              <li><strong>Correct</strong> inaccurate personal data.</li>
              <li><strong>Delete</strong> your account and associated personal data (see "Account Deletion" below).</li>
              <li><strong>Restrict or object</strong> to certain processing activities.</li>
              <li><strong>Data portability</strong> — receive a copy of your data in a machine-readable format.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              To exercise these rights, contact us at{" "}
              <a href="mailto:privacy@servicetones.com" className="text-primary hover:underline">
                privacy@servicetones.com
              </a>.
            </p>

            <h3 className="font-semibold text-lg mb-2 mt-4">7.1 Account Deletion</h3>
            <p className="text-muted-foreground leading-relaxed">
              You can permanently delete your account at any time from your{" "}
              <Link to="/settings" className="text-primary hover:underline">Account Settings</Link>{" "}
              page. Deleting your account will remove your profile, bookings, and personal data in accordance
              with our data retention policy above. Deletion is irreversible — please download any data you
              need before proceeding.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-semibold text-2xl mb-3">8. Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement industry-standard security measures including TLS encryption in transit,
              at-rest encryption for databases, httpOnly/Secure session cookies, CSRF token protection,
              rate limiting on authentication endpoints, and biometric-protected credential storage on
              mobile devices. No system is 100% secure; please use a strong, unique password and enable
              Face ID / biometric login on mobile.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-semibold text-2xl mb-3">9. Children's Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Platform is not directed to children under 13 (or under 16 in the EU). We do not
              knowingly collect personal information from children. If you believe a child has provided
              us personal data, contact us immediately at{" "}
              <a href="mailto:privacy@servicetones.com" className="text-primary hover:underline">
                privacy@servicetones.com
              </a>.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-semibold text-2xl mb-3">10. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of material changes
              via email or an in-app notice at least 14 days before the change takes effect. Continued use
              of the Platform after that date constitutes acceptance of the revised policy.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-semibold text-2xl mb-3">11. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              ServiceTones, Inc.<br />
              Attn: Privacy Team<br />
              Email:{" "}
              <a href="mailto:privacy@servicetones.com" className="text-primary hover:underline">
                privacy@servicetones.com
              </a>
            </p>
          </section>

        </div>
        </section>
      </main>

      <footer className="page-shell pb-10 pt-2 text-center text-sm text-muted-foreground">
        <p>
          <Link to="/terms" className="hover:underline">Terms of Service</Link>
          {" · "}
          <Link to="/privacy" className="hover:underline">Privacy Policy</Link>
          {" · "}
          &copy; {new Date().getFullYear()} ServiceTones, Inc.
        </p>
      </footer>
    </div>
  );
}

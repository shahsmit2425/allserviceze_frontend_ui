import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-transparent" data-theme="customer">
      <header className="sticky top-0 z-10 border-b border-white/60 bg-white/80 backdrop-blur-xl">
        <div className="page-shell py-4">
          <Link to="/" className="inline-flex items-center gap-2 rounded-lg border border-teal-200/80 bg-white px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
        </div>
      </header>

      <main className="page-shell space-y-8 py-8">
        <section className="page-hero">
          <span className="page-kicker">Legal</span>
          <h1 className="heading-2 mt-4 text-foreground">Terms of Service</h1>
          <p className="body-lg mt-3 text-muted-foreground">Last updated: April 26, 2026</p>
        </section>

        <section className="rounded-xl border border-white/70 bg-white/88 p-6 shadow-xl shadow-teal-900/5 backdrop-blur-sm sm:p-8">
        <div className="prose prose-slate max-w-none space-y-8">

          <section>
            <h2 className="font-heading font-semibold text-2xl mb-3">1. Agreement to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms of Service ("Terms") form a legally binding agreement between you and
              ServiceTones, Inc. ("ServiceTones", "we", "us", or "our") governing your access to and
              use of the ServiceTones platform — including our website, mobile application, and all
              related services (collectively, the "Platform").
            </p>
            <p className="text-muted-foreground leading-relaxed mt-2">
              By creating an account or using the Platform, you confirm that you are at least 18 years
              old, have read and understood these Terms, and agree to be bound by them. If you do not
              agree, do not use the Platform.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-semibold text-2xl mb-3">2. The Platform</h2>
            <p className="text-muted-foreground leading-relaxed">
              ServiceTones is a marketplace that connects individuals seeking home and professional
              services ("Customers") with independent service providers ("Providers"). ServiceTones is
              not a service provider itself and does not employ Providers. We are not a party to any
              service agreement between Customers and Providers.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-semibold text-2xl mb-3">3. Account Registration</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 leading-relaxed">
              <li>You must provide accurate, current, and complete information during registration.</li>
              <li>You are responsible for maintaining the confidentiality of your login credentials.</li>
              <li>You must notify us immediately of any unauthorized use of your account.</li>
              <li>You may not create an account on behalf of someone else without authorization.</li>
              <li>One person may not maintain multiple accounts.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading font-semibold text-2xl mb-3">4. Customer Responsibilities</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 leading-relaxed">
              <li>Provide accurate project descriptions and location information when posting projects.</li>
              <li>Respond promptly to quotes, messages, and appointment requests from Providers.</li>
              <li>Pay for services as agreed; do not circumvent the Platform to avoid fees.</li>
              <li>Treat Providers with respect; harassment or abusive behavior is prohibited.</li>
              <li>Leave honest, accurate reviews based on your actual experience.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading font-semibold text-2xl mb-3">5. Provider Responsibilities</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 leading-relaxed">
              <li>Complete identity and document verification as required by ServiceTones.</li>
              <li>Maintain all applicable licenses, certifications, and insurance required to provide your services.</li>
              <li>Accurately represent your skills, qualifications, and availability.</li>
              <li>Arrive on time, complete work to a professional standard, and communicate proactively.</li>
              <li>Do not solicit customers off-platform to avoid fees or circumvent dispute resolution.</li>
              <li>Comply with all applicable laws and regulations in the jurisdictions where you work.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading font-semibold text-2xl mb-3">6. Payments and Fees</h2>
            <p className="text-muted-foreground leading-relaxed">
              Payments are processed securely via Stripe. ServiceTones charges a platform service fee
              applied to each completed booking (fee schedule available in your account settings).
              Providers receive payouts according to the payout schedule shown in their dashboard.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-2">
              All fees are displayed before you confirm a booking. By confirming, you authorize the
              charge. Disputes about payment must be raised through the Platform's dispute resolution
              process within 14 days of the service date.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-semibold text-2xl mb-3">7. Subscriptions</h2>
            <p className="text-muted-foreground leading-relaxed">
              Certain Provider features require a paid subscription. Subscriptions automatically renew
              at the end of each billing period unless cancelled before the renewal date. You can cancel
              your subscription at any time from your account settings; cancellation takes effect at the
              end of the current billing period and no partial refunds are issued.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-semibold text-2xl mb-3">8. Prohibited Conduct</h2>
            <p className="text-muted-foreground leading-relaxed">You agree not to:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 leading-relaxed mt-2">
              <li>Use the Platform for any unlawful purpose or in violation of these Terms.</li>
              <li>Post false, misleading, or fraudulent content.</li>
              <li>Harass, threaten, or abuse other users.</li>
              <li>Attempt to gain unauthorized access to any part of the Platform.</li>
              <li>Use automated scripts, bots, or crawlers without written permission.</li>
              <li>Circumvent or manipulate the review, rating, or payment systems.</li>
              <li>Infringe the intellectual property rights of ServiceTones or others.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading font-semibold text-2xl mb-3">9. Reviews and Content</h2>
            <p className="text-muted-foreground leading-relaxed">
              By submitting a review or any other content to the Platform, you grant ServiceTones a
              non-exclusive, royalty-free, worldwide license to display, reproduce, and distribute
              that content in connection with the Platform. You represent that your content is accurate
              and does not violate any law or third-party rights. We reserve the right to remove content
              that violates these Terms.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-semibold text-2xl mb-3">10. Dispute Resolution</h2>
            <p className="text-muted-foreground leading-relaxed">
              If a dispute arises between a Customer and Provider, both parties agree to first attempt
              resolution through the Platform's in-app dispute process. ServiceTones may mediate disputes
              at its discretion. ServiceTones decisions on disputes are final within the Platform context.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-2">
              Any legal disputes arising from these Terms shall be governed by the laws of the State of
              Delaware, USA. You agree to binding arbitration for disputes under $10,000; larger disputes
              may be brought in the courts of Delaware with jurisdiction exclusive to those courts.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-semibold text-2xl mb-3">11. Disclaimers</h2>
            <p className="text-muted-foreground leading-relaxed">
              THE PLATFORM IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED.
              SERVICETONES DOES NOT GUARANTEE THE QUALITY, SAFETY, OR LEGALITY OF SERVICES OFFERED
              BY PROVIDERS. YOU USE THE PLATFORM AT YOUR OWN RISK. TO THE MAXIMUM EXTENT PERMITTED
              BY APPLICABLE LAW, SERVICETONES DISCLAIMS ALL WARRANTIES, INCLUDING IMPLIED WARRANTIES
              OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-semibold text-2xl mb-3">12. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, SERVICETONES'S TOTAL LIABILITY TO YOU FOR ANY
              CLAIM ARISING FROM THESE TERMS OR YOUR USE OF THE PLATFORM SHALL NOT EXCEED THE GREATER
              OF (A) THE AMOUNT YOU PAID TO SERVICETONES IN THE 12 MONTHS PRECEDING THE CLAIM, OR
              (B) $100 USD. IN NO EVENT SHALL SERVICETONES BE LIABLE FOR INDIRECT, INCIDENTAL,
              CONSEQUENTIAL, OR PUNITIVE DAMAGES.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-semibold text-2xl mb-3">13. Account Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              You may delete your account at any time from your{" "}
              <Link to="/settings" className="text-primary hover:underline">Account Settings</Link>.
              Account deletion is permanent and irreversible. Any outstanding balances must be settled
              before deletion.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-2">
              ServiceTones reserves the right to suspend or permanently terminate your account for
              any material violation of these Terms, fraudulent activity, or conduct that harms the
              Platform or its users.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-semibold text-2xl mb-3">14. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may modify these Terms from time to time. Material changes will be communicated via
              email or in-app notice at least 14 days before taking effect. Continued use of the
              Platform after that date constitutes your acceptance of the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-semibold text-2xl mb-3">15. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions about these Terms, contact us at:{" "}
              <a href="mailto:legal@servicetones.com" className="text-primary hover:underline">
                legal@servicetones.com
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

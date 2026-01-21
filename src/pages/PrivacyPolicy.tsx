import { Link } from 'react-router-dom'
import { ArrowLeft, Phone, Mail, MapPin } from 'lucide-react'

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-border/50 shadow-sm">
        <div className="w-full px-4 py-3 flex items-center justify-between">
          <div>
            <Link to="/" className="text-lg md:text-xl font-bold text-primary hover:text-primary/80">
              Apartment-Spokane.com
            </Link>
            <p className="text-xs text-muted-foreground hidden sm:block">Pet Friendly Apartments in Browne's Addition</p>
          </div>
          <a href="tel:8886130442" className="flex items-center gap-2 text-base md:text-lg font-bold text-primary hover:text-primary/80 transition-colors">
            <Phone className="w-5 h-5" />
            (888) 613-0442
          </a>
        </div>
      </header>

      <main className="w-full px-4 py-8 md:py-12">
        <div className="max-w-3xl mx-auto">
          <Link to="/" className="inline-flex items-center gap-2 text-primary hover:text-primary/80 mb-6">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          <h1 className="text-2xl md:text-3xl font-bold mb-6">Privacy Policy</h1>
          <p className="text-muted-foreground mb-8">Last updated: January 2026</p>

          <div className="prose prose-sm md:prose-base max-w-none space-y-6 text-foreground">
            <section>
              <h2 className="text-xl font-semibold mb-3">Introduction</h2>
              <p className="text-muted-foreground">
                Apartment-Spokane.com ("we," "our," or "us") respects your privacy and is committed to protecting the personal information you share with us. This Privacy Policy explains how we collect, use, and safeguard your information when you visit our website or contact us about our rental properties.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Information We Collect</h2>
              <p className="text-muted-foreground mb-3">
                When you submit our contact form to schedule a tour, we collect the following information:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>First and last name</li>
                <li>Email address</li>
                <li>Phone number</li>
                <li>Preferred tour date and time</li>
                <li>Any questions or comments you provide</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">How We Use Your Information</h2>
              <p className="text-muted-foreground mb-3">
                We use the information you provide solely for the purpose of:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li><strong>Scheduling property tours</strong> - We will contact you by phone, SMS text message, or email to arrange and confirm tour appointments</li>
                <li><strong>Responding to inquiries</strong> - We will respond to your questions about our rental properties</li>
                <li><strong>Communication about availability</strong> - We may notify you about unit availability or relevant property updates</li>
              </ul>
              <p className="text-muted-foreground mt-3">
                <strong>We do not sell, rent, or share your personal information with third parties for marketing purposes.</strong>
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">How We Contact You</h2>
              <p className="text-muted-foreground mb-3">
                By submitting our contact form, you consent to be contacted by us via:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li><strong>Phone calls</strong> - To discuss tour scheduling and answer questions</li>
                <li><strong>SMS/Text messages</strong> - For tour confirmations, reminders, and quick communications</li>
                <li><strong>Email</strong> - For tour confirmations and follow-up information</li>
              </ul>
              <p className="text-muted-foreground mt-3">
                These communications are limited to tour scheduling and property-related inquiries only. You may opt out of SMS communications at any time by replying STOP to any text message.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Data Security</h2>
              <p className="text-muted-foreground">
                We implement reasonable security measures to protect your personal information from unauthorized access, disclosure, or misuse. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Data Retention</h2>
              <p className="text-muted-foreground">
                We retain your personal information only for as long as necessary to fulfill the purposes for which it was collected, including scheduling tours and responding to inquiries. Once you are no longer a prospective tenant, we may delete your information or retain it in accordance with applicable legal requirements.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Your Rights</h2>
              <p className="text-muted-foreground mb-3">
                You have the right to:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Request access to the personal information we hold about you</li>
                <li>Request correction of inaccurate information</li>
                <li>Request deletion of your personal information</li>
                <li>Opt out of SMS/text message communications</li>
              </ul>
              <p className="text-muted-foreground mt-3">
                To exercise any of these rights, please contact us using the information below.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Cookies and Analytics</h2>
              <p className="text-muted-foreground">
                Our website may use cookies and similar technologies to improve your browsing experience. These do not collect personally identifiable information unless you submit our contact form.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Changes to This Policy</h2>
              <p className="text-muted-foreground">
                We may update this Privacy Policy from time to time. Any changes will be posted on this page with an updated "Last updated" date.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Contact Us</h2>
              <p className="text-muted-foreground mb-3">
                If you have questions about this Privacy Policy or wish to exercise your privacy rights, please contact us:
              </p>
              <div className="space-y-2 text-muted-foreground">
                <p className="flex items-center gap-2">
                  <Phone className="w-4 h-4" /> (888) 613-0442
                </p>
                <p className="flex items-center gap-2">
                  <Mail className="w-4 h-4" /> info@apartment-spokane.com
                </p>
                <p className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> 104 S Oak St, Spokane WA 99201
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-muted border-t border-border py-6">
        <div className="w-full px-4 text-center text-xs text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Apartment-Spokane.com. All rights reserved.</p>
          <div className="mt-2 space-x-4">
            <Link to="/privacy" className="hover:text-primary">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-primary">Terms of Use</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

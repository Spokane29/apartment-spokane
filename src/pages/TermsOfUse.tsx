import { Link } from 'react-router-dom'
import { ArrowLeft, Phone, Mail, MapPin } from 'lucide-react'

export default function TermsOfUse() {
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

          <h1 className="text-2xl md:text-3xl font-bold mb-6">Terms of Use</h1>
          <p className="text-muted-foreground mb-8">Last updated: January 2026</p>

          <div className="prose prose-sm md:prose-base max-w-none space-y-6 text-foreground">
            <section>
              <h2 className="text-xl font-semibold mb-3">Agreement to Terms</h2>
              <p className="text-muted-foreground">
                By accessing and using Apartment-Spokane.com (the "Website"), you agree to be bound by these Terms of Use. If you do not agree to these terms, please do not use this Website.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Website Purpose</h2>
              <p className="text-muted-foreground">
                This Website is operated by Apartment-Spokane.com to provide information about our rental property located at 104 S Oak St, Spokane, WA 99201, and to allow prospective tenants to schedule property tours and submit inquiries.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Contact Form and Communications</h2>
              <p className="text-muted-foreground mb-3">
                When you submit information through our contact form:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>You agree to provide accurate and complete information</li>
                <li>You consent to be contacted by phone, SMS text message, or email regarding your tour request</li>
                <li>You understand that these communications are solely for tour scheduling and property-related inquiries</li>
                <li>You may opt out of SMS communications at any time by replying STOP</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">SMS/Text Message Terms</h2>
              <p className="text-muted-foreground mb-3">
                By providing your phone number and submitting our contact form, you expressly consent to receive text messages from Apartment-Spokane.com. These messages may include:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Tour confirmation and scheduling details</li>
                <li>Tour reminders</li>
                <li>Responses to your inquiries</li>
                <li>Property availability updates</li>
              </ul>
              <p className="text-muted-foreground mt-3">
                Message frequency varies. Message and data rates may apply. Reply STOP to cancel SMS messages at any time. Reply HELP for assistance.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Property Information</h2>
              <p className="text-muted-foreground">
                While we strive to keep all information on this Website accurate and up-to-date, we do not warrant that property descriptions, photos, pricing, availability, or other information is complete, accurate, or current. All information is subject to change without notice. Please verify all details during your property tour or by contacting us directly.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">No Lease Agreement</h2>
              <p className="text-muted-foreground">
                Submitting a contact form or scheduling a tour does not create a lease agreement or guarantee availability of any rental unit. A binding lease agreement is only created when a formal lease document is signed by both parties.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Intellectual Property</h2>
              <p className="text-muted-foreground">
                All content on this Website, including text, images, graphics, and design, is the property of Apartment-Spokane.com and is protected by copyright and other intellectual property laws. You may not reproduce, distribute, or use any content without our written permission.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">User Conduct</h2>
              <p className="text-muted-foreground mb-3">
                You agree not to:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Use this Website for any unlawful purpose</li>
                <li>Submit false or misleading information</li>
                <li>Attempt to interfere with the Website's operation</li>
                <li>Use automated systems to access or scrape the Website</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Disclaimer of Warranties</h2>
              <p className="text-muted-foreground">
                This Website is provided "as is" without warranties of any kind, either express or implied. We do not warrant that the Website will be uninterrupted, error-free, or free of viruses or other harmful components.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Limitation of Liability</h2>
              <p className="text-muted-foreground">
                To the fullest extent permitted by law, Apartment-Spokane.com shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of this Website.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Governing Law</h2>
              <p className="text-muted-foreground">
                These Terms of Use shall be governed by and construed in accordance with the laws of the State of Washington, without regard to its conflict of law provisions.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Changes to Terms</h2>
              <p className="text-muted-foreground">
                We reserve the right to modify these Terms of Use at any time. Changes will be effective immediately upon posting to this Website. Your continued use of the Website after any changes constitutes acceptance of the new terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Contact Us</h2>
              <p className="text-muted-foreground mb-3">
                If you have questions about these Terms of Use, please contact us:
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

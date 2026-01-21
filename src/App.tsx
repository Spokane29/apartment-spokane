import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Phone,
  Mail,
  MapPin,
  Bed,
  Bath,
  Square,
  DollarSign,
  Check,
  Star,
  Clock,
  Shield,
  PawPrint,
  Car,
  Wifi,
  TreeDeciduous,
  Send,
  ChevronLeft,
  ChevronRight,
  X,
  Calendar,
  Sparkles,
} from 'lucide-react'

// Property images
const propertyImages = [
  { src: '/images/exterior.png', alt: 'Building exterior - tan brick apartment building with garage' },
  { src: '/images/living-room.jpg', alt: 'Spacious living room with hardwood floors and built-in shelves' },
  { src: '/images/kitchen.jpg', alt: 'Kitchen with classic checkered floor and white cabinets' },
  { src: '/images/dining-room.jpg', alt: 'Dining room with ceiling fan and hardwood floors' },
  { src: '/images/bedroom.jpg', alt: 'Bedroom with hardwood floors and closet' },
  { src: '/images/bathroom.jpg', alt: 'Bathroom with white subway tile and black accent trim' },
  { src: '/images/patio.png', alt: 'Private backyard patio with seating and grill' },
]

const features = [
  { icon: PawPrint, label: 'Pet Friendly' },
  { icon: Car, label: 'Reserved Parking' },
  { icon: Wifi, label: 'Cable TV Ready' },
  { icon: TreeDeciduous, label: 'Backyard Access' },
  { icon: Shield, label: 'Smoke Free' },
  { icon: Square, label: 'Storage Included' },
]

const amenities = [
  'Backyard picnic area',
  'Hardwood floors',
  'Laundry In building',
  'Great Neighborhood',
  'Stove/Range',
  'Refrigerator',
  'Window covering',
  'Cable TV hookups',
  'Garbage',
  'Pet friendly',
  'Storage Space Included',
]

function App() {
  const [currentImage, setCurrentImage] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    tourDate: '',
    tourTime: '',
    message: '',
  })
  const [formSubmitted, setFormSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const nextImage = () => setCurrentImage((prev) => (prev + 1) % propertyImages.length)
  const prevImage = () => setCurrentImage((prev) => (prev - 1 + propertyImages.length) % propertyImages.length)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitError('')

    try {
      const response = await fetch('https://leasingvoice.com/api/leads/external', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          propertyInterest: "Browne's Addition Apartment - 104 S Oak St",
          moveInDate: formData.tourDate,
          message: formData.tourTime
            ? `Preferred tour time: ${formData.tourTime}. ${formData.message}`
            : formData.message,
          source: 'apartment-spokane-tour-form',
          companyId: 'apartment-spokane'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to submit form')
      }

      setFormSubmitted(true)
    } catch (error) {
      console.error('Form submission error:', error)
      setSubmitError('Something went wrong. Please try again or call us directly.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const scrollToForm = () => {
    document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-border/50 shadow-sm">
        <div className="w-full max-w-6xl mx-auto px-3 py-2 flex items-center justify-between">
          <div>
            <h1 className="text-base md:text-lg font-bold text-primary">Apartment-Spokane.com</h1>
            <p className="text-[10px] text-muted-foreground hidden sm:block">Pet Friendly Apartments in Browne's Addition</p>
          </div>
          <a href="tel:8886130442" className="flex items-center gap-1.5 text-sm md:text-base font-bold text-primary hover:text-primary/80 transition-colors">
            <Phone className="w-4 h-4" />
            (888) 613-0442
          </a>
        </div>
      </header>

      {/* Urgency Banner */}
      <div className="bg-gradient-to-r from-primary via-primary/90 to-primary text-white py-2 md:py-2.5 px-3 overflow-hidden">
        <div className="w-full max-w-6xl mx-auto flex items-center justify-center gap-2 text-sm md:text-base font-semibold text-center">
          <Sparkles className="w-4 h-4 animate-bounce" />
          <span className="animate-pulse">
            <strong className="text-yellow-300">Move-in Special:</strong> Move in by Feb 1 & get{' '}
            <strong className="text-yellow-300">$400 off</strong> first month!
          </span>
          <Sparkles className="w-4 h-4 animate-bounce" />
        </div>
      </div>

      <main>
        {/* Hero Section */}
        <section className="relative">
          <div className="w-full max-w-6xl mx-auto px-3 py-3 md:py-4">
            <div className="grid lg:grid-cols-5 gap-3 lg:gap-4">
              {/* Left: Gallery & Info */}
              <div className="lg:col-span-3 space-y-2">
                {/* Main Image Gallery */}
                <div className="relative rounded-lg overflow-hidden shadow-lg group">
                  <img
                    src={propertyImages[currentImage].src}
                    alt={propertyImages[currentImage].alt}
                    className="w-full aspect-[4/3] object-cover cursor-pointer transition-transform duration-300 group-hover:scale-[1.02]"
                    onClick={() => setLightboxOpen(true)}
                  />

                  {/* Image Navigation - Always visible on mobile */}
                  <button
                    onClick={prevImage}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg transition-all md:opacity-0 md:group-hover:opacity-100"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg transition-all md:opacity-0 md:group-hover:opacity-100"
                    aria-label="Next image"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>

                  {/* Image Counter */}
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
                    {currentImage + 1} / {propertyImages.length}
                  </div>

                  {/* Price Badge */}
                  <div className="absolute top-2 left-2 bg-primary text-white font-bold text-base px-2.5 py-1 rounded-md shadow-lg">
                    $1,200/mo
                  </div>
                </div>

                {/* Thumbnail Strip */}
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide -mx-3 px-3 md:mx-0 md:px-0">
                  {propertyImages.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImage(idx)}
                      className={`flex-shrink-0 rounded overflow-hidden transition-all ${
                        idx === currentImage ? 'ring-2 ring-primary ring-offset-1' : 'opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={img.src} alt={img.alt} className="w-12 h-9 md:w-14 md:h-10 object-cover" />
                    </button>
                  ))}
                </div>

                {/* Property Title & Quick Stats */}
                <div>
                  <h2 className="text-base md:text-lg font-bold text-foreground mb-0.5">
                    Beautiful Apartment at Browne's Addition
                  </h2>
                  <div className="flex items-center gap-1.5 text-muted-foreground mb-2 text-xs">
                    <MapPin className="w-3 h-3 text-primary flex-shrink-0" />
                    <span>104 South Oak, Spokane WA 99201</span>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    <div className="flex items-center gap-1">
                      <div className="bg-primary/10 p-1 rounded">
                        <Bed className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <p className="font-semibold text-xs">2 Bed</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="bg-primary/10 p-1 rounded">
                        <Bath className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <p className="font-semibold text-xs">1 Bath</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="bg-primary/10 p-1 rounded">
                        <Square className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <p className="font-semibold text-xs">700 sqft</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="bg-green-100 p-1 rounded">
                        <DollarSign className="w-3.5 h-3.5 text-green-600" />
                      </div>
                      <p className="font-semibold text-green-600 text-xs">$1,200</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Contact Form (Sticky on desktop) */}
              <div className="lg:col-span-2">
                <div className="lg:sticky lg:top-14" id="contact-form">
                  <Card className="shadow-lg border border-primary/20">
                    <div className="bg-primary text-white p-2.5 rounded-t-lg">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
                        <h3 className="font-bold text-sm">Schedule a Tour</h3>
                      </div>
                      <p className="text-primary-foreground/80 text-[11px]">
                        Get $400 off when you move in by Feb 1st!
                      </p>
                    </div>
                    <CardContent className="p-3">
                      {formSubmitted ? (
                        <div className="text-center py-4">
                          <div className="bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2">
                            <Check className="w-6 h-6 text-green-600" />
                          </div>
                          <h4 className="text-base font-bold text-foreground mb-1">Thank You!</h4>
                          <p className="text-muted-foreground text-xs">
                            We'll contact you within 24 hours.
                          </p>
                        </div>
                      ) : (
                        <form onSubmit={handleSubmit} className="space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label htmlFor="firstName" className="text-xs">First Name *</Label>
                              <Input
                                id="firstName"
                                placeholder="John"
                                required
                                className="h-8 text-sm"
                                value={formData.firstName}
                                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label htmlFor="lastName" className="text-xs">Last Name *</Label>
                              <Input
                                id="lastName"
                                placeholder="Doe"
                                required
                                className="h-8 text-sm"
                                value={formData.lastName}
                                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                              />
                            </div>
                          </div>

                          <div>
                            <Label htmlFor="email" className="text-xs">Email *</Label>
                            <Input
                              id="email"
                              type="email"
                              placeholder="john@example.com"
                              required
                              className="h-8 text-sm"
                              value={formData.email}
                              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                          </div>

                          <div>
                            <Label htmlFor="phone" className="text-xs">Phone *</Label>
                            <Input
                              id="phone"
                              type="tel"
                              placeholder="(509) 555-1234"
                              required
                              className="h-8 text-sm"
                              value={formData.phone}
                              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            />
                          </div>

                          <div>
                            <Label htmlFor="message" className="text-xs">Message (optional)</Label>
                            <Textarea
                              id="message"
                              placeholder="Any questions?"
                              rows={2}
                              className="text-sm resize-none"
                              value={formData.message}
                              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                            />
                          </div>

                          {submitError && (
                            <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-2 rounded">
                              {submitError}
                            </div>
                          )}

                          <Button
                            type="submit"
                            className="w-full h-9 text-sm font-semibold shadow-md"
                            disabled={isSubmitting}
                          >
                            {isSubmitting ? (
                              <>
                                <span className="animate-spin mr-1">⏳</span>
                                Submitting...
                              </>
                            ) : (
                              <>
                                <Send className="w-3.5 h-3.5 mr-1.5" />
                                Schedule Tour
                              </>
                            )}
                          </Button>

                          <p className="text-[10px] text-center text-muted-foreground leading-tight">
                            By submitting, you consent to contact by phone, SMS, or email.{' '}
                            <Link to="/privacy" className="underline">Privacy</Link> |{' '}
                            <Link to="/terms" className="underline">Terms</Link>
                          </p>
                        </form>
                      )}
                    </CardContent>
                  </Card>

                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Description Section */}
        <section className="bg-muted/30 py-3">
          <div className="w-full max-w-6xl mx-auto px-3">
            <h2 className="text-sm font-bold mb-2">About This Property</h2>
            <p className="text-xs text-muted-foreground">
              Charming 2 bedroom, 1 bath apartment in historic Browne's Addition. Excellent location - two blocks to restaurants, coffee shops, and pubs. Easy walk to downtown, bus stop on corner. Laundry in building. This quiet 8-unit building is minutes from Downtown Spokane, Kendall Yards, and I-90.
            </p>
          </div>
        </section>

        {/* Amenities List */}
        <section className="bg-muted/50 py-3">
          <div className="w-full max-w-6xl mx-auto px-3">
            <h2 className="text-sm font-bold mb-2">Property Features</h2>
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-2 gap-y-1">
              {amenities.map((amenity, idx) => (
                <div key={idx} className="flex items-center gap-1">
                  <Check className="w-3 h-3 text-green-600 flex-shrink-0" />
                  <span className="text-foreground text-[11px]">{amenity}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="bg-muted border-t border-border py-3 pb-20 lg:pb-3">
        <div className="w-full max-w-6xl mx-auto px-3">
          <div className="flex flex-wrap justify-between items-start gap-3 mb-2 text-xs">
            <div>
              <h3 className="font-bold text-foreground">Apartment-Spokane.com</h3>
              <p className="text-muted-foreground">Browne's Addition, Spokane</p>
            </div>
            <div className="text-muted-foreground">
              <a href="tel:8886130442" className="flex items-center gap-1 hover:text-primary">
                <Phone className="w-3 h-3" /> (888) 613-0442
              </a>
              <p className="flex items-center gap-1">
                <MapPin className="w-3 h-3" /> 104 S Oak St, Spokane WA
              </p>
            </div>
          </div>
          <div className="border-t border-border pt-2 text-center text-[10px] text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} Apartment-Spokane.com |{' '}
              <Link to="/privacy" className="hover:text-primary">Privacy</Link> |{' '}
              <Link to="/terms" className="hover:text-primary">Terms</Link>
            </p>
          </div>
        </div>
      </footer>

      {/* Lightbox */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4">
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 text-white hover:text-white/80 transition-colors"
            aria-label="Close lightbox"
          >
            <X className="w-8 h-8" />
          </button>
          <button
            onClick={prevImage}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 p-3 rounded-full transition-colors"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <img
            src={propertyImages[currentImage].src}
            alt={propertyImages[currentImage].alt}
            className="max-w-full max-h-[85vh] object-contain rounded-lg"
          />
          <button
            onClick={nextImage}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 p-3 rounded-full transition-colors"
            aria-label="Next image"
          >
            <ChevronRight className="w-6 h-6 text-white" />
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {propertyImages.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentImage(idx)}
                className={`w-2 h-2 rounded-full transition-all ${
                  idx === currentImage ? 'bg-white w-6' : 'bg-white/50'
                }`}
                aria-label={`Go to image ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Mobile Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-border shadow-xl p-2 lg:hidden z-40">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="font-bold text-primary text-sm">$1,200/mo</p>
            <p className="text-[10px] text-muted-foreground">2 bed • 1 bath • 700 sqft</p>
          </div>
          <div className="flex gap-1.5">
            <a href="tel:8886130442" className="bg-green-600 text-white p-2 rounded">
              <Phone className="w-4 h-4" />
            </a>
            <Button onClick={scrollToForm} size="sm" className="shadow text-xs h-8">
              <Calendar className="w-3.5 h-3.5 mr-1" />
              Tour
            </Button>
          </div>
        </div>
      </div>

    </div>
  )
}

export default App

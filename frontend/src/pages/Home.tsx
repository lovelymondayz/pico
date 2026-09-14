import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div className="min-h-screen bg-bg">
      {/* Nav */}
      <nav className="bg-surface border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <span className="text-xl font-bold text-primary">Pico</span>
            <div className="flex items-center gap-4">
              <Link to="/login" className="text-sm text-text-muted hover:text-text transition-colors">
                Sign In
              </Link>
              <Link to="/register" className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block mb-4 px-4 py-1.5 bg-primary-subtle text-primary text-sm font-medium rounded-full">
            Event Photo Sharing Platform
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold text-text leading-tight">
            Capture Every Moment,<br />
            <span className="text-primary">Together</span>
          </h1>
          <p className="mt-6 text-xl text-text-muted max-w-2xl mx-auto leading-relaxed">
            Pico lets you create beautiful photo-sharing events. Your guests snap, upload, and relive the magic — no accounts needed.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              to="/register"
              className="px-8 py-3.5 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors text-lg"
            >
              Start Free Event
            </Link>
            <Link
              to="/login"
              className="px-8 py-3.5 bg-surface border border-border text-text rounded-lg font-medium hover:bg-surface-alt transition-colors text-lg"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4 bg-surface border-y border-border">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-text">How Pico Works</h2>
            <p className="mt-4 text-text-muted text-lg">Three simple steps to collect event memories</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-bg rounded-xl p-8 border border-border">
              <div className="w-12 h-12 bg-primary-subtle rounded-lg flex items-center justify-center text-2xl mb-4">
                📋
              </div>
              <h3 className="text-xl font-semibold text-text mb-2">1. Create an Event</h3>
              <p className="text-text-muted leading-relaxed">
                Set up your event in seconds. Give it a name, pick dates, and Pico generates a unique QR code and guest link instantly.
              </p>
            </div>
            <div className="bg-bg rounded-xl p-8 border border-border">
              <div className="w-12 h-12 bg-primary-subtle rounded-lg flex items-center justify-center text-2xl mb-4">
                📸
              </div>
              <h3 className="text-xl font-semibold text-text mb-2">2. Guests Upload</h3>
              <p className="text-text-muted leading-relaxed">
                Guests scan the QR code or open the link, type their name, and start uploading photos. No app download, no account creation.
              </p>
            </div>
            <div className="bg-bg rounded-xl p-8 border border-border">
              <div className="w-12 h-12 bg-primary-subtle rounded-lg flex items-center justify-center text-2xl mb-4">
                🖼️
              </div>
              <h3 className="text-xl font-semibold text-text mb-2">3. View & Share</h3>
              <p className="text-text-muted leading-relaxed">
                Watch the gallery fill up in real time. Browse photos, download favorites, or grab everything in one ZIP file.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-text">Why Event Organizers Love Pico</h2>
            <p className="mt-4 text-text-muted text-lg">Built for weddings, parties, conferences, and every celebration in between</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6">
              <div className="text-2xl mb-3">🎯</div>
              <h3 className="font-semibold text-text mb-1">Zero Friction</h3>
              <p className="text-sm text-text-muted">No apps, no logins, no passwords. Guests just scan and upload.</p>
            </div>
            <div className="p-6">
              <div className="text-2xl mb-3">📱</div>
              <h3 className="font-semibold text-text mb-1">Mobile-First</h3>
              <p className="text-sm text-text-muted">Works beautifully on every phone. Camera access built right in.</p>
            </div>
            <div className="p-6">
              <div className="text-2xl mb-3">🔒</div>
              <h3 className="font-semibold text-text mb-1">Private by Default</h3>
              <p className="text-sm text-text-muted">Each event is isolated. Only people with the link can see and upload.</p>
            </div>
            <div className="p-6">
              <div className="text-2xl mb-3">⚡</div>
              <h3 className="font-semibold text-text mb-1">Real-Time Gallery</h3>
              <p className="text-sm text-text-muted">New photos appear instantly for everyone at the event.</p>
            </div>
            <div className="p-6">
              <div className="text-2xl mb-3">🗜️</div>
              <h3 className="font-semibold text-text mb-1">One-Click Download</h3>
              <p className="text-sm text-text-muted">Download all photos in a single ZIP file. No manual selecting.</p>
            </div>
            <div className="p-6">
              <div className="text-2xl mb-3">📊</div>
              <h3 className="font-semibold text-text mb-1">Smart Dashboard</h3>
              <p className="text-sm text-text-muted">Track events, photos, guests, and storage from one clean panel.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Perfect for */}
      <section className="py-20 px-4 bg-surface border-t border-border">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-text mb-8">Perfect For</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { emoji: '💒', label: 'Weddings' },
              { emoji: '🎂', label: 'Birthdays' },
              { emoji: '🎓', label: 'Graduations' },
              { emoji: '🏢', label: 'Conferences' },
              { emoji: '🎪', label: 'Festivals' },
              { emoji: '🏖️', label: 'Vacations' },
              { emoji: '👶', label: 'Baby Showers' },
              { emoji: '🎄', label: 'Holidays' },
            ].map(item => (
              <div key={item.label} className="bg-bg rounded-xl p-4 border border-border text-center">
                <div className="text-2xl mb-1">{item.emoji}</div>
                <div className="text-sm font-medium text-text">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center bg-primary-subtle rounded-2xl p-12 border border-primary/20">
          <h2 className="text-3xl font-bold text-text mb-4">Ready to collect memories?</h2>
          <p className="text-lg text-text-muted mb-8">
            Set up your first event in under a minute. No credit card required.
          </p>
          <Link
            to="/register"
            className="inline-block px-8 py-4 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors text-lg"
          >
            Create Your Free Event
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-sm text-text-muted">
            © {new Date().getFullYear()} Pico. Made with ❤️ for event organizers.
          </div>
          <div className="flex items-center gap-6 text-sm text-text-muted">
            <a href="https://pico.arjism.com" className="hover:text-text transition-colors">
              Live Demo
            </a>
            <a href="https://github.com/lovelymondayz/pico" className="hover:text-text transition-colors">
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}

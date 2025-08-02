import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-primary/5 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      <div className="floating-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-4xl mx-auto">
          {/* Logo/Icon */}
          <div className="hero-icon mb-8">
            <span className="material-symbols-outlined">hub</span>
          </div>

          {/* Main heading */}
          <h1 className="hero-title mb-6">
            Study<span className="text-accent">Hub</span>
          </h1>

          {/* Subtitle */}
          <p className="hero-subtitle mb-4">
            Your Academic Peer Learning Platform
          </p>

          {/* Tagline */}
          <p className="hero-tagline mb-12">
            Connect. Share. Excel.
          </p>

          {/* Feature highlights */}
          <div className="features-grid mb-12">
            <div className="feature-card">
              <span className="material-symbols-outlined">groups</span>
              <span>Peer Learning</span>
            </div>
            <div className="feature-card">
              <span className="material-symbols-outlined">library_books</span>
              <span>Resource Sharing</span>
            </div>
            <div className="feature-card">
              <span className="material-symbols-outlined">forum</span>
              <span>Live Discussions</span>
            </div>
          </div>

          {/* CTA buttons */}
          <div className="flex gap-4 items-center justify-center flex-col sm:flex-row mt-20">
            <Link href="/sign-up">
              <button className="btn-primary cta-primary">
                <span className="material-symbols-outlined">rocket_launch</span>
                Get Started
              </button>
            </Link>
            <button className="btn-accent cta-secondary">
              <span className="material-symbols-outlined">explore</span>
              Explore Resources
            </button>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="scroll-indicator">
          <span className="material-symbols-outlined">keyboard_arrow_down</span>
        </div>
      </div>
    </div>
  );
}
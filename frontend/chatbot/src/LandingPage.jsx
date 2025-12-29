import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function LandingPage() {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const { currentUser, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  async function handleLogout() {
    try {
      await logout();
      navigate('/');
    } catch (err) {
      console.error('Failed to log out', err);
    }
  }

  return (
    <div className="landing-wrapper">
      {/* Navigation */}
      <nav className={`nav-container ${isScrolled ? 'scrolled' : ''}`}>
        <div className="nav-content">
          <a href="#" className="nav-logo">
            <div className="nav-logo-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <span className="nav-logo-text">Bite Line</span>
          </a>
          
          <div className="nav-links">
            <a href="#features" className="nav-link">Features</a>
            <a href="#how-it-works" className="nav-link">How It Works</a>
            <a href="#contact" className="nav-link">Contact</a>
          </div>
          
          <div className="nav-cta">
            {currentUser ? (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 1.25rem',
                    borderRadius: '12px',
                    border: '2px solid rgba(255,255,255,0.2)',
                    background: 'rgba(255,255,255,0.1)',
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '0.95rem',
                    transition: 'all 0.3s'
                  }}
                >
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.9rem',
                    fontWeight: '700'
                  }}>
                    {currentUser.email[0].toUpperCase()}
                  </div>
                  <span>{currentUser.email.split('@')[0]}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </button>
                
                {showUserMenu && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '0.5rem',
                    background: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                    minWidth: '200px',
                    overflow: 'hidden',
                    zIndex: 1000
                  }}>
                    <div style={{
                      padding: '1rem',
                      borderBottom: '1px solid #e5e7eb'
                    }}>
                      <p style={{ 
                        fontSize: '0.85rem', 
                        color: '#6b7280',
                        marginBottom: '0.25rem'
                      }}>
                        Signed in as
                      </p>
                      <p style={{ 
                        fontSize: '0.95rem', 
                        color: '#1f2937',
                        fontWeight: '600'
                      }}>
                        {currentUser.email}
                      </p>
                    </div>
                    <button
                      onClick={() => navigate('/chat')}
                      style={{
                        width: '100%',
                        padding: '0.875rem 1rem',
                        border: 'none',
                        background: 'white',
                        color: '#374151',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '0.95rem',
                        fontWeight: '500',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.background = '#f9fafb'}
                      onMouseLeave={(e) => e.target.style.background = 'white'}
                    >
                      Go to Chat
                    </button>
                    <button
                      onClick={handleLogout}
                      style={{
                        width: '100%',
                        padding: '0.875rem 1rem',
                        border: 'none',
                        background: 'white',
                        color: '#dc2626',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '0.95rem',
                        fontWeight: '500',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.background = '#fef2f2'}
                      onMouseLeave={(e) => e.target.style.background = 'white'}
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button 
                  onClick={() => navigate('/login')}
                  style={{
                    padding: '0.75rem 1.5rem',
                    borderRadius: '12px',
                    border: '2px solid rgba(255,255,255,0.2)',
                    background: 'rgba(255,255,255,0.1)',
                    color: 'white',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '0.95rem',
                    transition: 'all 0.3s'
                  }}
                >
                  Log In
                </button>
                <button 
                  onClick={() => navigate('/signup')} 
                  className="btn btn-primary"
                >
                  Sign Up
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Rest of your landing page content remains the same */}
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-badge">
            <span className="pulse-dot"></span>
            <span style={{ fontSize: '0.95rem', fontWeight: '600', color: '#1f2937' }}>
              Available 24/7 in 4 Languages
            </span>
          </div>
          
          <h1 className="hero-title">
            <span className="hero-title-gradient">Instant Help</span><br/>
            for Animal Bites
          </h1>
          
          <p className="hero-subtitle">
            Get immediate guidance, find nearby treatment facilities, and access expert-verified 
            information through our AI-powered chatbot. Help is just a click away.
          </p>
          
          <div className="hero-buttons">
            <button onClick={() => navigate('/chat')} className="hero-button hero-button-primary">
              Start Chat Now
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
            <button onClick={() => navigate('/location')} className="hero-button hero-button-secondary">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              Find Clinics
            </button>
          </div>
          
          <div className="hero-stats">
            <div className="hero-avatars">
              <div className="hero-avatar"></div>
              <div className="hero-avatar"></div>
              <div className="hero-avatar"></div>
              <div className="hero-avatar"></div>
            </div>
            <div className="hero-stats-text">
              <div className="hero-stats-number">10,000+ users helped</div>
              <div className="hero-stats-label">Trusted by thousands</div>
            </div>
          </div>
        </div>
        
        {/* Chat Preview Card */}
        <div className="chat-preview">
          <div className="chat-messages">
            <div className="chat-message user">
              <div className="chat-avatar user-avatar">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <div className="chat-bubble user-bubble">
                I was bitten by a dog. What should I do?
              </div>
            </div>
            
            <div className="chat-message bot">
              <div className="chat-avatar bot-avatar">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <div className="chat-bubble bot-bubble">
                I'm here to help! First, wash the wound thoroughly with soap and water for at least 5 minutes. 
                Let me ask a few questions to provide specific guidance...
              </div>
            </div>
          </div>
          
          <div className="chat-features">
            <div className="chat-feature">
              <div className="chat-feature-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 6v6l4 2"/>
                </svg>
              </div>
              <span className="chat-feature-text">Instant Response</span>
            </div>
            <div className="chat-feature">
              <div className="chat-feature-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <span className="chat-feature-text">Expert Verified</span>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="stats-container">
          <div className="stat-item">
            <div className="stat-number">10K+</div>
            <div className="stat-label">Users Helped</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">4</div>
            <div className="stat-label">Languages</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">24/7</div>
            <div className="stat-label">Support</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">500+</div>
            <div className="stat-label">Clinics Listed</div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section">
        <div className="section-header">
          <h2 className="section-title">Why Choose Bite Line?</h2>
          <p className="section-subtitle">Comprehensive support when you need it most</p>
        </div>
        
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <h3 className="feature-title">AI-Powered Chatbot</h3>
            <p className="feature-description">
              Get instant answers about animal bites in multiple languages with voice and text support
            </p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
            <h3 className="feature-title">Find Nearby Clinics</h3>
            <p className="feature-description">
              Locate treatment facilities near you quickly with real-time directions and contact info
            </p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 6v6l4 2"/>
              </svg>
            </div>
            <h3 className="feature-title">24/7 Availability</h3>
            <p className="feature-description">
              Access help anytime, anywhere you need it. We're always here when emergencies happen
            </p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <h3 className="feature-title">Expert Verified</h3>
            <p className="feature-description">
              All information reviewed by medical professionals to ensure accuracy and safety
            </p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" style={{ padding: '8rem 2rem', background: 'white' }}>
        <div className="section-header">
          <h2 className="section-title">How It Works</h2>
          <p className="section-subtitle">Get help in three simple steps</p>
        </div>
        
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '3rem' }}>
          {[
            { num: '1', title: 'Start a Conversation', desc: 'Type or speak your question in your preferred language' },
            { num: '2', title: 'Get Instant Answers', desc: 'Receive AI-powered guidance based on medical expertise' },
            { num: '3', title: 'Find Treatment', desc: 'Locate nearby clinics and get directions instantly' }
          ].map((step, idx) => (
            <div key={idx} style={{ 
              background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
              padding: '3rem',
              borderRadius: '24px',
              border: '2px solid #e2e8f0',
              transition: 'all 0.3s ease'
            }}>
              <div style={{
                width: '80px',
                height: '80px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2.5rem',
                fontWeight: '900',
                color: 'white',
                marginBottom: '2rem',
                boxShadow: '0 10px 30px rgba(102, 126, 234, 0.3)'
              }}>
                {step.num}
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1f2937', marginBottom: '1rem' }}>
                {step.title}
              </h3>
              <p style={{ fontSize: '1.05rem', color: '#6b7280', lineHeight: '1.7' }}>
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content">
          <h2 className="cta-title">Ready to Get Started?</h2>
          <p className="cta-subtitle">
            Join thousands who trust Bite Line for immediate animal bite guidance
          </p>
          <div className="cta-buttons">
            <button onClick={() => navigate('/chat')} className="hero-button hero-button-primary">
              Start Chatting Now
            </button>
            <button onClick={() => navigate('/location')} className="hero-button hero-button-secondary">
              Find Clinics
            </button>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" style={{ padding: '8rem 2rem', background: 'white' }}>
        <div className="section-header">
          <h2 className="section-title">Get In Touch</h2>
          <p className="section-subtitle">We're here to help</p>
        </div>
        
        <div style={{ 
          maxWidth: '1400px', 
          margin: '0 auto', 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
          gap: '2rem' 
        }}>
          {[
            { 
              icon: <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 6 10-6"/></svg>,
              title: 'Email Us',
              info: 'support@biteline.com'
            },
            {
              icon: <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
              title: 'Call Us',
              info: '+91 1800-BITELINE'
            },
            {
              icon: <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
              title: 'Live Chat',
              info: 'Available 24/7'
            }
          ].map((contact, idx) => (
            <div key={idx} style={{
              background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
              padding: '3rem',
              borderRadius: '24px',
              textAlign: 'center',
              border: '2px solid #e2e8f0',
              transition: 'all 0.3s ease'
            }}>
              <div style={{
                width: '80px',
                height: '80px',
                background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
                borderRadius: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.5rem',
                color: '#667eea'
              }}>
                {contact.icon}
              </div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: '700', color: '#1f2937', marginBottom: '0.75rem' }}>
                {contact.title}
              </h3>
              <p style={{ fontSize: '1.05rem', color: '#6b7280' }}>
                {contact.info}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-section">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <span style={{ fontSize: '1.5rem', fontWeight: '700', color: 'white' }}>Bite Line</span>
            </div>
            <p style={{ lineHeight: '1.7' }}>
              Providing instant, reliable guidance for animal bite emergencies in multiple languages.
            </p>
          </div>
          
          <div className="footer-section">
            <h4>Quick Links</h4>
            <ul>
              <li><a href="#features">Features</a></li>
              <li><a href="#how-it-works">How It Works</a></li>
              <li><a href="#contact">Contact</a></li>
            </ul>
          </div>
          
          <div className="footer-section">
            <h4>Resources</h4>
            <ul>
              <li><button onClick={() => navigate('/chat')} style={{ background: 'none', border: 'none', color: '#a0aec0', cursor: 'pointer', padding: 0 }}>Start Chat</button></li>
              <li><button onClick={() => navigate('/location')} style={{ background: 'none', border: 'none', color: '#a0aec0', cursor: 'pointer', padding: 0 }}>Find Clinics</button></li>
              <li><a href="#">Medical Guidelines</a></li>
              <li><a href="#">Safety Tips</a></li>
            </ul>
          </div>
          
          <div className="footer-section">
            <h4>Legal</h4>
            <ul>
              <li><a href="#">Privacy Policy</a></li>
              <li><a href="#">Terms of Service</a></li>
              <li><a href="#">Medical Disclaimer</a></li>
            </ul>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>© 2025 Bite Line. All rights reserved. | Medical information should not replace professional consultation.</p>
        </div>
      </footer>
    </div>
  );
}
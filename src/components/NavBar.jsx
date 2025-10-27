import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/useAuth';
import { Menu, X, Video, FileText, Layout, MessageCircle, User, LogOut } from 'lucide-react';

// List of navigation items
const navItems = [
  { name: 'Chat', to: '/project/proj-001/chat', icon: MessageCircle },
  { name: 'Video Call', to: '/project/proj-001/video', icon: Video },
  { name: 'Documents', to: '/project/proj-001/documents', icon: FileText },
  { name: 'Whiteboard', to: '/project/proj-001/whiteboard', icon: Layout },
];

export default function NavBar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Handling logout
  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error("Logout failed:", error);
      // Optional: Display a temporary error message to the user
    }
  };

  // Close menu on navigation (mobile UX)
  const handleNavLinkClick = () => setIsMenuOpen(false);

  // NavLink helper for reusability
  const NavLink = ({ to, name, icon: Icon, onClick }) => (
    <Link 
      to={to} 
      onClick={onClick || handleNavLinkClick} 
      className="flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors duration-200 
                 text-teal-300 hover:bg-teal-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
    >
      <Icon className="w-5 h-5" />
      <span>{name}</span>
    </Link>
  );

  return (
    <nav className="bg-gray-900 shadow-2xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <div className="flex-shrink-0">
            <Link to="/chat" className="text-2xl font-extrabold text-teal-400 tracking-wider rounded transition-all">
              {/* RemoteCollab 🚀 */}
                {/* <p className='border mono italic'>COLLBAT</p> */}
<p className=" relative font-mono italic uppercase tracking-wide    inline-block overflow-hidden select-none">
  <span className="relative text-black text-4xl z-10 glass-text shine-text">
    COLLBAT
  </span>
</p>

<style jsx>{`
  .glass-text {
    color: black;
    background: linear-gradient(135deg, #000000cc, #112f2fcc);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    text-shadow:
      1px 1px 2px rgba(45, 168, 144, 0.8),
      2px 2px 5px rgba(45, 168, 144, 0.5),
      0 0 15px rgba(45, 168, 144, 0.7);
    position: relative;
    display: inline-block;
  }

  .shine-text {
    background: linear-gradient(
      -50deg,
      transparent 45%,
      rgba(255, 255, 255, 0.8) 48%,
      rgba(255, 255, 255, 0.8) 52%,
      transparent 55%
    );
    background-size: 200% 100%;
    animation: tiltedShine 3s linear infinite;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    mix-blend-mode: screen;
  }

  @keyframes tiltedShine {
    0% {
      background-position: 100% 0%;
    }
    100% {
      background-position: -100% 0%;
    }
  }
`}</style>




            </Link>
          </div>

          {user ? (
            <>
              {/* Desktop Menu */}
              <div className="hidden lg:flex lg:items-center lg:space-x-4">
                {navItems.map((item) => (
                  <NavLink key={item.to} {...item} />
                ))}
                <NavLink to="/profile" name="Profile" icon={User} />
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold text-white 
                             bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-600 shadow-md duration-150"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Logout</span>
                </button>
              </div>
              {/* Mobile Menu Button */}
              <div className="lg:hidden">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="inline-flex items-center justify-center p-2 rounded-md text-teal-300 
                             hover:text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-teal-600"
                >
                  {isMenuOpen ? (
                    <X className="block h-6 w-6" aria-label="Close menu" />
                  ) : (
                    <Menu className="block h-6 w-6" aria-label="Open menu" />
                  )}
                </button>
              </div>
            </>
          ) : (
            <div>
              <Link to="/login" className="bg-teal-600 px-5 py-2 rounded-xl font-bold text-white shadow-lg hover:bg-teal-700 transition-colors">
                Login
              </Link>
            </div>
          )}
        </div>
      </div>
      {/* Mobile Menu Panel */}
      <div 
        className={`lg:hidden overflow-hidden transition-all duration-300 bg-gray-800 rounded-b-2xl 
                    ${isMenuOpen ? 'max-h-96 opacity-100 py-3' : 'max-h-0 opacity-0'}`}
      >
        {user && (
          <div className="px-4 pt-2 pb-3 space-y-2 border-t border-gray-800">
            {navItems.map((item) => (
              <NavLink key={item.to} {...item} />
            ))}
            <NavLink to="/profile" name="Profile" icon={User} />
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold text-white 
                         bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-600 transition-all"
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}

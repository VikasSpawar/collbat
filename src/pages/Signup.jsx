
import SignupForm from '../features/auth/components/SignupForm';

export default function Login() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gray-900 px-6 overflow-hidden font-sans">
      {/* Neon laser grid background */}
      <svg
        aria-hidden="true"
        className="absolute inset-0 w-full h-full stroke-teal-600/20"
        fill="none"
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Vertical lines - spaced grid */}
        <g strokeWidth="1">
          {[...Array(25)].map((_, i) => (
            <line key={`v-${i}`} x1={i * 50} y1="0" x2={i * 50} y2="800" className="animate-pulse" />
          ))}
        </g>
        {/* Horizontal lines */}
        <g strokeWidth="1">
          {[...Array(17)].map((_, i) => (
            <line key={`h-${i}`} x1="0" y1={i * 50} x2="1200" y2={i * 50} className="animate-pulse delay-200" />
          ))}
        </g>

        {/* Diagonal laser beams */}
        <line
          x1="0" y1="800" x2="1200" y2="0"
          strokeWidth="3"
          className="stroke-teal-400 opacity-40 animate-pulse"
        />
        <line
          x1="0" y1="400" x2="800" y2="0"
          strokeWidth="2"
          className="stroke-teal-500 opacity-30 animate-pulse delay-300"
        />
        <line
          x1="400" y1="800" x2="1200" y2="200"
          strokeWidth="2"
          className="stroke-teal-500 opacity-30 animate-pulse delay-500"
        />
      </svg>

      {/* Angled glowing accent blocks */}
      <div className="pointer-events-none absolute top-0 left-0 w-48 h-48 bg-gradient-to-tr from-teal-500 to-transparent opacity-50
                      clip-path-[polygon(0_0,100%_0,100%_100%)] shadow-[0_0_20px_6px_rgba(20,184,166,0.6)]" />
      <div className="pointer-events-none absolute bottom-0 right-0 w-48 h-48 bg-gradient-to-bl from-teal-500 to-transparent opacity-40
                      clip-path-[polygon(0_100%,100%_0,0_0)] shadow-[0_0_25px_8px_rgba(20,184,166,0.5)]" />

      {/* Form container */}
      <div className="relative z-10 w-full max-w-md rounded-3xl bg-gray-900 border-2 border-teal-600 shadow-2xl p-10">
        <SignupForm />
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { useAuth } from '../useAuth';
import { Link } from 'react-router-dom';

export default function SignupForm() {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);

  // Trigger animation after mount
  useEffect(() => {
    const timeout = setTimeout(() => setAnimateIn(true), 100);
    return () => clearTimeout(timeout);
  }, []);



  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const { error } = await signUp(email, password);
      if (error) {
        setError(error.message);
      } else {
        setMessage('Signup successful! Please check your email to confirm.');
      }
    } finally {
      setLoading(false);
    }
  };

    const handleSubmitGuest = async (email,password) => {
    
    setLoading(true);
    setError(null);
    try {
      const { error } = await signIn(email, password);
      if (error) setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
       className={`max-w-md w-full mx-auto p-8 bg-gray-900 rounded-2xl shadow-2xl flex flex-col border-2 border-gray-800 
                  transition-transform duration-500 ease-out transform ${animateIn ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'}`}
     >
      <h2 className="text-2xl font-extrabold mb-8 text-center text-teal-400 tracking-tight flex items-center justify-center space-x-2">
        <span className="material-symbols-outlined">person_add</span>
        <span>Sign Up</span>
      </h2>

      {error && (
        <p className="mb-5 text-red-500 text-center font-semibold flex items-center justify-center space-x-1 select-none">
          <span className="material-symbols-outlined">error</span>
          <span>{error}</span>
        </p>
      )}
      {message && (
        <p className="mb-5 text-teal-400 text-center font-semibold flex items-center justify-center space-x-1 select-none">
          <span className="material-symbols-outlined">check_circle</span>
          <span>{message}</span>
        </p>
      )}

      <label htmlFor="email-input" className="mb-1 text-gray-400 font-semibold flex items-center space-x-1">
        <span className="material-symbols-outlined text-teal-400">email</span>
        <span>Email</span>
      </label>
      <input
        id="email-input"
        type="email"
        placeholder="Enter your email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
        autoComplete="email"
        className="mb-5 px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-gray-100 placeholder-gray-500 
                   focus:outline-none focus:ring-2 focus:ring-teal-600 transition-shadow"
        spellCheck={false}
        aria-invalid={error ? "true" : "false"}
      />

      <label htmlFor="password-input" className="mb-1 text-gray-400 font-semibold flex justify-between items-center">
        <div className="flex items-center space-x-1">
          <span className="material-symbols-outlined text-teal-400">lock</span>
          <span>Password</span>
        </div>
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="text-sm text-teal-400 hover:text-teal-300 focus:outline-none flex items-center space-x-1"
          aria-pressed={showPassword}
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          <span className='material-symbols-outlined text-teal-400'>{!showPassword ? "visibility_off" : "visibility"}</span>
          <span className="sr-only">{showPassword ? "Hide password" : "Show password"}</span>
        </button>
      </label>
      <input
        id="password-input"
        type={showPassword ? "text" : "password"}
        placeholder="Enter your password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        required
        autoComplete="new-password"
        className="mb-6 px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-gray-100 placeholder-gray-500 
                   focus:outline-none focus:ring-2 focus:ring-teal-600 transition-shadow"
      />

      <button
        type="submit"
        disabled={!email || !password || loading}
        className={`py-3 bg-teal-600 text-white font-bold rounded-full shadow-md flex items-center justify-center space-x-2 
                    hover:bg-teal-500 active:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <span>Sign Up</span>
        <span className="material-symbols-outlined pt-1 select-none">login</span>
      </button>
       <p className="mt-8 text-center text-gray-400 text-sm">
        Don’t have an account?{' '}
        <Link
          to="/login"
          className="text-teal-400 hover:text-teal-300 font-semibold underline"
        >
          Sign In
        </Link>
      </p>
        <p onClick={()=>handleSubmitGuest('guest@123' , '12345678')} className="mt-4 cursor-pointer flex align-middle mx-auto text-center text-gray-400 text-sm">
        Try as guest ?  {' '}
          <span  className=" material-symbols-outlined text-teal-400 hover:text-teal-300 mx-1 ">
        {' '} Account_circle
        </span>
      </p>
    </form>
  );
}

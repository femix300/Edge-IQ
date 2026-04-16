import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const AuthPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [isLogin, setIsLogin] = useState(
    location.state?.isSignUp === true ? false : true,
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    login();
    navigate("/markets");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#080d1a] px-4 font-body">
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute -left-[20%] -top-[20%] h-[50%] w-[50%] rounded-full bg-[#1a4db8]/20 blur-[120px]" />
        <div className="absolute -right-[20%] -bottom-[20%] h-[50%] w-[50%] rounded-full bg-[#7cd9ac]/10 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-[#434653]/30 bg-[#090e1b] p-8 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)]">
        <button
          onClick={() => navigate("/")}
          className="mb-6 flex cursor-pointer items-center gap-2 font-mono text-xs uppercase tracking-widest text-[#8d909e] transition-colors hover:text-[#dee2f5]"
        >
          <span className="material-symbols-outlined text-[16px]">
            arrow_back
          </span>{" "}
          Return Home
        </button>
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-3xl font-bold text-[#b3c5ff]">
              bolt
            </span>
            <span className="font-headline text-3xl font-bold text-[#dee2f5]">
              EdgeIQ
            </span>
          </div>
          <h2 className="font-headline text-xl text-[#c3c6d5]">
            {isLogin ? "Log in to your account" : "Create your account"}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin && (
            <div>
              <label className="mb-1 block font-mono text-xs uppercase tracking-widest text-[#8d909e]">
                Full Name
              </label>
              <input
                type="text"
                className="w-full rounded-xl border border-[#434653]/50 bg-[#1a1f2d] px-4 py-3 text-[#dee2f5] placeholder-[#8d909e] outline-none transition-colors focus:border-[#b3c5ff] focus:bg-[#252a38]"
                placeholder="John Doe"
                required
              />
            </div>
          )}

          <div>
            <label className="mb-1 block font-mono text-xs uppercase tracking-widest text-[#8d909e]">
              Email Address
            </label>
            <input
              type="email"
              className="w-full rounded-xl border border-[#434653]/50 bg-[#1a1f2d] px-4 py-3 text-[#dee2f5] placeholder-[#8d909e] outline-none transition-colors focus:border-[#b3c5ff] focus:bg-[#252a38]"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="mb-1 block font-mono text-xs uppercase tracking-widest text-[#8d909e]">
              Password
            </label>
            <input
              type="password"
              className="w-full rounded-xl border border-[#434653]/50 bg-[#1a1f2d] px-4 py-3 text-[#dee2f5] placeholder-[#8d909e] outline-none transition-colors focus:border-[#b3c5ff] focus:bg-[#252a38]"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full cursor-pointer rounded-xl bg-[#1a4db8] py-3.5 font-headline text-lg font-bold text-[#b8c8ff] shadow-lg transition-transform hover:brightness-110 active:scale-[0.98]"
          >
            {isLogin ? "Log In" : "Sign Up"}
          </button>
        </form>

        <div className="my-8 flex items-center">
          <div className="flex-1 border-t border-[#434653]/30"></div>
          <span className="mx-4 font-mono text-xs text-[#8d909e]">
            OR CONNECT WITH
          </span>
          <div className="flex-1 border-t border-[#434653]/30"></div>
        </div>

        <button className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl border border-[#434653]/50 bg-[#1a1f2d] py-3 text-[#dee2f5] transition-colors hover:bg-[#252a38]">
          <span className="material-symbols-outlined">api</span>
          Continue with Bayse
        </button>

        <p className="mt-8 text-center text-sm text-[#8d909e]">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="cursor-pointer font-bold text-[#b3c5ff] hover:underline"
          >
            {isLogin ? "Sign up" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthPage;

import React from "react";
import { Link } from "react-router-dom";
import { useLogin } from "../hooks/useLogin";
import { Container } from "../../../common/ui/Container";
import { Heading } from "../../../common/ui/Heading";
import { Text } from "../../../common/ui/Text";

const LoginPage: React.FC = () => {
  const { formData, error, loading, handleChange, handleLogin } = useLogin();

  return (
    <Container variant="page">
      <Container variant="card">
        {/* Scanline effect */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ background: "repeating-linear-gradient(0deg, #fff, #fff 1px, transparent 1px, transparent 2px)", backgroundSize: "100% 4px" }}></div>
        
        <header className="flex flex-col items-center pb-4">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-8 h-8 bg-primary shadow-[2px_2px_0_rgba(0,0,0,0.5)]"></div>
            <Heading level={1}>
              POKÉDEX ARCHIVE
            </Heading>
            <div className="w-8 h-8 bg-white shadow-[2px_2px_0_rgba(0,0,0,0.5)]"></div>
          </div>
          <div className="w-full flex items-center justify-between">
            <Heading level={2}>TRAINER LOGIN</Heading>
          </div>
          <div className="h-1 w-full bg-[#2d3449] mt-3 relative">
            <div className="absolute left-0 top-0 h-full w-1/4 bg-primary shadow-[2px_0_4px_rgba(255,31,31,0.5)]"></div>
          </div>
        </header>

        {error && <Text variant="error">{error}</Text>}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="font-headline text-[10px] uppercase tracking-[0.2em] text-outline font-bold block ml-1">USERNAME</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-primary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={formData.username}
                  onChange={handleChange}
                  className="w-full bg-[#0B1326] border-2 border-[#2d3449] rounded-sm py-4 pl-12 pr-4 text-sm font-headline tracking-widest focus:ring-0 focus:border-primary placeholder:text-outline/40 text-on-surface transition-all shadow-[inset_2px_2px_4px_rgba(0,0,0,0.5)]"
                  placeholder="TRAINER NAME"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <label className="font-headline text-[10px] uppercase tracking-[0.2em] text-outline font-bold block ml-1">PASSWORD</label>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-primary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>key</span>
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full bg-[#0B1326] border-2 border-[#2d3449] rounded-sm py-4 pl-12 pr-4 text-sm font-headline tracking-widest focus:ring-0 focus:border-primary placeholder:text-outline/40 text-on-surface transition-all shadow-[inset_2px_2px_4px_rgba(0,0,0,0.5)]"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full relative overflow-hidden bg-primary text-on-primary font-headline font-black py-5 rounded-sm uppercase tracking-[0.3em] beveled-button hover:bg-red-500 active:translate-y-[2px] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            <span className="relative z-10">{loading ? "AUTHENTICATING..." : "SIGN IN"}</span>
            <div className="absolute top-0 left-0 w-full h-1/2 bg-white/10"></div>
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="font-body text-xs text-on-surface-variant uppercase tracking-wider">
            No credentials?{" "}
            <Link
              to="/register"
              className="text-primary font-bold font-headline uppercase tracking-widest ml-1 hover:text-white transition-colors underline decoration-2 underline-offset-4"
            >
              Enlist Now
            </Link>
          </p>
        </div>
      </Container>
    </Container>
  );
};

export default LoginPage;

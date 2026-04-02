import React from "react";
import { Link } from "react-router-dom";
import { UserPlus, Mail, Lock, User } from "lucide-react";
import { useRegister } from "../hooks/useRegister";
import { Container } from "../../../common/ui/Container";
import { Heading } from "../../../common/ui/Heading";
import { Text } from "../../../common/ui/Text";

const RegisterPage: React.FC = () => {
  const { formData, error, loading, handleChange, handleRegister } =
    useRegister();

  return (
    <Container variant="page">
      <Container variant="card">
        <div className="text-center">
          <UserPlus className="mx-auto h-12 w-12 text-cyan-400" />
          <Heading level={2} className="mt-4">
            Join the Battle
          </Heading>
          <Text variant="secondary" className="mt-2">
            Create your new hero account
          </Text>
        </div>

        {error && <Text variant="error">{error}</Text>}

        <form onSubmit={handleRegister} className="mt-8 space-y-4">
          <div className="space-y-4">
            <div className="relative">
              <User className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
              <input
                id="username"
                name="username"
                type="text"
                required
                value={formData.username}
                onChange={handleChange}
                className="w-full pl-10 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all placeholder-slate-500"
                placeholder="Username"
              />
            </div>

            <div className="relative">
              <Mail className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full pl-10 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all placeholder-slate-500"
                placeholder="Email address"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full pl-10 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all placeholder-slate-500"
                placeholder="Password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 rounded-lg shadow-lg text-sm font-semibold text-slate-900 bg-cyan-400 hover:bg-cyan-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 focus:ring-offset-slate-900 transition-all disabled:opacity-50"
          >
            {loading ? "Forging identity..." : "Sign up"}
          </button>
        </form>

        <Text variant="secondary" className="text-center mt-6">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            Login here
          </Link>
        </Text>
      </Container>
    </Container>
  );
};

export default RegisterPage;

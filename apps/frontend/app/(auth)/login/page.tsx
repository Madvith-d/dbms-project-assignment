"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useState } from "react";
import signinImage from "@/signin.png";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;
const MOCK_AUTH_ENABLED = process.env.NEXT_PUBLIC_USE_MOCK_AUTH === "true";
const SIDE_IMAGE_URL = signinImage.src;

export default function LoginPage() {
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      setError(null);
      await login(data);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Invalid credentials";
      setError(message);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 sm:p-6">
      <div className="grid w-full max-w-6xl overflow-hidden rounded-3xl border border-white/10 bg-card shadow-2xl md:grid-cols-2">
        <div className="flex items-center justify-center bg-[#f8f6ef] p-6 sm:p-10">
          <Card className="w-full max-w-[420px] rounded-2xl border border-slate-200 bg-white shadow-xl">
            <CardHeader className="px-6 pb-2 pt-6">
              <CardTitle className="text-slate-900">Sign in</CardTitle>
              <CardDescription className="text-slate-600">
                Enter your credentials to access the platform
              </CardDescription>
              {MOCK_AUTH_ENABLED && (
                <p className="text-sm text-slate-500">
                  Mock auth enabled. Use any email/password to sign in.
                </p>
              )}
            </CardHeader>
            <form onSubmit={handleSubmit(onSubmit)}>
              <CardContent className="space-y-4 px-6">
                {error && (
                  <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-700">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    className="border-slate-300 bg-white text-slate-900 placeholder:text-slate-400"
                    {...register("email")}
                  />
                  {errors.email && (
                    <p className="text-xs text-red-600">
                      {errors.email.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-slate-700">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    className="border-slate-300 bg-white text-slate-900 placeholder:text-slate-400"
                    {...register("password")}
                  />
                  {errors.password && (
                    <p className="text-xs text-red-600">
                      {errors.password.message}
                    </p>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3 px-6 pb-6">
                <Button type="submit" className="w-full bg-[#1b7f4d] text-white hover:bg-[#16663e]" disabled={isSubmitting}>
                  {isSubmitting ? "Signing in..." : "Sign in"}
                </Button>
                <p className="text-sm text-slate-600">
                  Don&apos;t have an account?{" "}
                  <Link
                    href="/register"
                    className="font-medium text-slate-900 underline-offset-4 hover:underline"
                  >
                    Register
                  </Link>
                </p>
              </CardFooter>
            </form>
          </Card>
        </div>
        <div
          className="relative hidden min-h-[560px] bg-slate-900 md:block"
          style={{ backgroundImage: `url(${SIDE_IMAGE_URL})`, backgroundSize: "cover", backgroundPosition: "center" }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-black/25 to-black/40" />
        </div>
      </div>
    </div>
  );
}

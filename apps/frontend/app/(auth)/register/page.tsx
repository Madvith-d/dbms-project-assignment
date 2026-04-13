"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { registerUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import signinImage from "@/signin.png";

const registerSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().optional(),
});

type RegisterForm = z.infer<typeof registerSchema>;
const SIDE_IMAGE_URL = signinImage.src;

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    try {
      setError(null);
      await registerUser(data);
      router.push("/login");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Registration failed";
      setError(message);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 sm:p-6">
      <div className="grid w-full max-w-6xl overflow-hidden rounded-3xl border border-white/10 bg-card shadow-2xl md:grid-cols-2">
        <div className="flex items-center justify-center bg-[#f8f6ef] p-6 sm:p-10">
          <Card className="w-full max-w-[460px] rounded-2xl border border-slate-200 bg-white shadow-xl">
            <CardHeader className="px-6 pb-2 pt-6">
              <CardTitle className="text-slate-900">Create an account</CardTitle>
              <CardDescription className="text-slate-600">
                Fill in the details below to get started
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit(onSubmit)}>
              <CardContent className="space-y-4 px-6">
                {error && (
                  <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name" className="text-slate-700">First name</Label>
                    <Input
                      id="first_name"
                      {...register("first_name")}
                      placeholder="John"
                      className="border-slate-300 bg-white text-slate-900 placeholder:text-slate-400"
                    />
                    {errors.first_name && (
                      <p className="text-xs text-red-600">
                        {errors.first_name.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name" className="text-slate-700">Last name</Label>
                    <Input
                      id="last_name"
                      {...register("last_name")}
                      placeholder="Doe"
                      className="border-slate-300 bg-white text-slate-900 placeholder:text-slate-400"
                    />
                    {errors.last_name && (
                      <p className="text-xs text-red-600">
                        {errors.last_name.message}
                      </p>
                    )}
                  </div>
                </div>
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
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-slate-700">Phone (optional)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1234567890"
                    className="border-slate-300 bg-white text-slate-900 placeholder:text-slate-400"
                    {...register("phone")}
                  />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3 px-6 pb-6">
                <Button type="submit" className="w-full bg-[#1b7f4d] text-white hover:bg-[#16663e]" disabled={isSubmitting}>
                  {isSubmitting ? "Creating account..." : "Create account"}
                </Button>
                <p className="text-sm text-slate-600">
                  Already have an account?{" "}
                  <Link
                    href="/login"
                    className="font-medium text-slate-900 underline-offset-4 hover:underline"
                  >
                    Sign in
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

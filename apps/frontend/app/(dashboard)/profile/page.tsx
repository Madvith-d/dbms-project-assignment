"use client";

import { useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { useMutation } from "@tanstack/react-query";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User } from "@/types";

export default function ProfilePage() {
  const { user, refetch } = useAuth();

  const [profileForm, setProfileForm] = useState({
    first_name: user?.first_name ?? "",
    last_name: user?.last_name ?? "",
    phone: user?.phone ?? "",
  });
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState(false);

  const [pwForm, setPwForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);

  const updateProfile = useMutation({
    mutationFn: async (data: Partial<User & { phone: string }>) => {
      const res = await api.patch<{ user: User }>("/auth/me", data);
      return res.data.user;
    },
    onSuccess: async () => {
      await refetch();
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    },
    onError: () => {
      setProfileError("Failed to update profile.");
    },
  });

  const changePassword = useMutation({
    mutationFn: async (data: {
      current_password: string;
      new_password: string;
    }) => {
      const res = await api.patch<{ user: User }>("/auth/me", data);
      return res.data.user;
    },
    onSuccess: () => {
      setPwSuccess(true);
      setPwForm({ current_password: "", new_password: "", confirm_password: "" });
      setTimeout(() => setPwSuccess(false), 3000);
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : "Failed to change password.";
      setPwError(message);
    },
  });

  function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    setProfileError("");
    setProfileSuccess(false);
    if (!profileForm.first_name.trim() || !profileForm.last_name.trim()) {
      setProfileError("First and last name are required.");
      return;
    }
    updateProfile.mutate({
      first_name: profileForm.first_name.trim(),
      last_name: profileForm.last_name.trim(),
      phone: profileForm.phone || undefined,
    } as Partial<User & { phone: string }>);
  }

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPwError("");
    setPwSuccess(false);
    if (pwForm.new_password !== pwForm.confirm_password) {
      setPwError("New passwords do not match.");
      return;
    }
    if (pwForm.new_password.length < 8) {
      setPwError("New password must be at least 8 characters.");
      return;
    }
    changePassword.mutate({
      current_password: pwForm.current_password,
      new_password: pwForm.new_password,
    });
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Profile Settings</h2>
        <p className="text-muted-foreground">Manage your account information</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personal Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  value={profileForm.first_name}
                  onChange={(e) =>
                    setProfileForm((f) => ({ ...f, first_name: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  value={profileForm.last_name}
                  onChange={(e) =>
                    setProfileForm((f) => ({ ...f, last_name: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={user?.email ?? ""} disabled />
            </div>
            <div className="space-y-1">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={profileForm.phone}
                onChange={(e) =>
                  setProfileForm((f) => ({ ...f, phone: e.target.value }))
                }
                placeholder="+1 234 567 890"
              />
            </div>
            <div className="space-y-1">
              <Label>Role</Label>
              <Input value={user?.role ?? ""} disabled />
            </div>
            {profileError && <p className="text-sm text-destructive">{profileError}</p>}
            {profileSuccess && (
              <p className="text-sm text-green-500">Profile updated successfully!</p>
            )}
            <Button type="submit" disabled={updateProfile.isPending}>
              {updateProfile.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Change Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="current_password">Current Password</Label>
              <Input
                id="current_password"
                type="password"
                value={pwForm.current_password}
                onChange={(e) =>
                  setPwForm((f) => ({ ...f, current_password: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="new_password">New Password</Label>
              <Input
                id="new_password"
                type="password"
                value={pwForm.new_password}
                onChange={(e) =>
                  setPwForm((f) => ({ ...f, new_password: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="confirm_password">Confirm New Password</Label>
              <Input
                id="confirm_password"
                type="password"
                value={pwForm.confirm_password}
                onChange={(e) =>
                  setPwForm((f) => ({ ...f, confirm_password: e.target.value }))
                }
              />
            </div>
            {pwError && <p className="text-sm text-destructive">{pwError}</p>}
            {pwSuccess && (
              <p className="text-sm text-green-500">Password changed successfully!</p>
            )}
            <Button type="submit" disabled={changePassword.isPending}>
              {changePassword.isPending ? "Changing..." : "Change Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// src/pages/LoginPage.jsx

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";

// Shadcn UI components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "../components/hooks/use-toast";

function LoginPage() {
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    let emailToLogin = usernameOrEmail;

    try {
      const isEmail = emailToLogin.includes("@");
      if (!isEmail) {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("username", "==", emailToLogin));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          throw new Error("auth/user-not-found");
        }

        emailToLogin = querySnapshot.docs[0].data().email;
      }

      await signInWithEmailAndPassword(auth, emailToLogin, password);
      toast({
        title: "Success",
        description: "Logged in successfully!",
      });
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      let errorMessage =
        "Invalid username/email or password. Please try again.";

      if (
        err.code === "auth/user-not-found" ||
        err.code === "auth/wrong-password"
      ) {
        errorMessage = "Invalid username/email or password. Please try again.";
      } else if (err.code) {
        errorMessage = `An error occurred: ${err.message}`;
      }

      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen w-screen gradient-background p-4">
      <Card className="w-full max-w-sm shadow-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>
            Enter your username or email below to access your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="usernameOrEmail">Username or Email</Label>
              <Input
                id="usernameOrEmail"
                type="text"
                placeholder="m@example.com or myusername"
                required
                value={usernameOrEmail}
                onChange={(e) => setUsernameOrEmail(e.target.value)}
                autoComplete="username"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default LoginPage;

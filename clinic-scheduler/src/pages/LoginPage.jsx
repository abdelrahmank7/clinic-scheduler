// src/pages/LoginPage.jsx (Updated to include a test error button)
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useAuthState } from "react-firebase-hooks/auth"; // Import useAuthState
import { getIdTokenResult } from "firebase/auth"; // Import getIdTokenResult
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";

function LoginPage() {
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [user] = useAuthState(auth); // Get the current user state

  // Check user type and redirect after login (when user state changes)
  useEffect(() => {
    const checkAndRedirect = async () => {
      if (user) {
        // If user is now logged in
        try {
          const idTokenResult = await getIdTokenResult(user);
          const userType = idTokenResult.claims.userType || "admin"; // Default to admin if claim not set
          if (userType === "admin") {
            navigate("/dashboard"); // Redirect to admin dashboard after login
          } else if (userType === "client") {
            // This shouldn't happen on the admin login page, but just in case
            // Redirect client users to their portal if they somehow land here after login
            // navigate("/client/portal"); // Assuming client portal route exists
          } else {
            // Handle other potential user types if needed
            console.warn("Unknown user type:", userType);
            navigate("/dashboard"); // Default fallback for admin login
          }
        } catch (error) {
          console.error("Error getting user claims after login:", error);
          // If claim check fails, assume admin for the admin login page
          navigate("/dashboard");
        }
      }
    };

    checkAndRedirect();
  }, [user, navigate]); // Run this effect when the 'user' state changes

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Attempt standard email/password login
      const userCredential = await signInWithEmailAndPassword(
        auth,
        usernameOrEmail,
        password
      );
      // Do NOT navigate here anymore. useEffect will handle it after user state updates.
      // The user state update triggers the useEffect above.
    } catch (error) {
      console.error("Login error: ", error);
      let errorMessage = "Login failed. Please check your credentials.";
      if (error.code === "auth/user-not-found") {
        errorMessage = "Username or email not found.";
      } else if (error.code === "auth/wrong-password") {
        errorMessage = "Incorrect password.";
      }
      toast({
        title: "Login Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Function to simulate an error for testing
  const triggerTestError = () => {
    console.log("Triggering a test error...");
    // This will cause an error in the console and should be caught by the global handler
    // or the ErrorBoundary if this component was inside one (it's not directly now,
    // but the global handler in main.jsx should catch it).
    throw new Error("This is a test error from LoginPage!");
  };

  // Optional: Show a loading state while checking user claims after login
  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <p>Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Clinic Login</CardTitle>
          <p className="text-sm text-muted-foreground">
            Enter your credentials to access the system.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="usernameOrEmail">Username or Email</Label>
              <Input
                id="usernameOrEmail"
                type="text"
                placeholder="Enter username or email"
                value={usernameOrEmail}
                onChange={(e) => setUsernameOrEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing In..." : "Sign In"}
            </Button>
          </form>
          {/* Add the test error button */}
          <div className="mt-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={triggerTestError}
            >
              Trigger Test Error (Debug)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default LoginPage;

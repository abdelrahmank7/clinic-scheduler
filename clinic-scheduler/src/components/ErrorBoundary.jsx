// src/components/ErrorBoundary.jsx
import React from "react";
import { ErrorLoggingService } from "../services/ErrorLoggingService"; // Import the service
import { Button } from "@/components/ui/button"; // Assuming you use shadcn Button
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Assuming you use shadcn Card

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to an error reporting service
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    ErrorLoggingService.logError(
      error.message,
      error.stack,
      "ErrorBoundary", // Location
      "error", // Level
      { componentStack: errorInfo.componentStack } // Extra info
    );

    // Update state with error details (optional, for display in fallback UI)
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="flex justify-center items-center min-h-screen bg-background p-4">
          <Card className="w-full max-w-md shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="text-xl font-semibold text-destructive">
                Something Went Wrong
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground mb-4">
                An unexpected error occurred. Our team has been notified.
              </p>
              <Button onClick={this.handleReload}>Reload Page</Button>
              {/* Optional: Show error details in development */}
              {/* {process.env.NODE_ENV === 'development' && (
                <details className="text-left mt-4 p-2 bg-muted rounded">
                  <summary className="font-medium">Error Details</summary>
                  <p><strong>Error:</strong> {this.state.error?.toString()}</p>
                  <p><strong>Stack:</strong> <pre className="text-xs">{this.state.errorInfo?.componentStack}</pre></p>
                </details>
              )} */}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

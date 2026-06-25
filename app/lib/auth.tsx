import React, { createContext, useContext, useState } from "react";
import {
  ClerkProvider,
  useAuth,
  useUser,
  SignInButton,
  UserButton,
} from "@clerk/clerk-react";

interface AppAuthContextType {
  isSignedIn: boolean;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  getToken: () => Promise<string | null>;
  AuthUI: React.ReactNode;
}

const AppAuthContext = createContext<AppAuthContextType | null>(null);

const isClerkEnabled =
  typeof import.meta.env.VITE_CLERK_PUBLISHABLE_KEY === "string" &&
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY !== "" &&
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY !== "pk_test_...";

// Wrapper component that uses Clerk hooks safely
const ClerkAuthWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isSignedIn, userId, getToken } = useAuth();
  const { user } = useUser();

  const authValue: AppAuthContextType = {
    isSignedIn: !!isSignedIn,
    userId: userId ?? null,
    userName: user?.fullName ?? user?.username ?? null,
    userEmail: user?.primaryEmailAddress?.emailAddress ?? null,
    getToken: async () => {
      try {
        return await getToken();
      } catch (e) {
        console.error("Failed to get Clerk token", e);
        return null;
      }
    },
    AuthUI: isSignedIn ? (
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 13, color: "var(--muted-2)" }}>
          {user?.fullName ?? user?.username}
        </span>
        <UserButton afterSignOutUrl="/" />
      </div>
    ) : (
      <SignInButton mode="modal">
        <button className="link-btn accent" style={{ fontSize: 14 }}>
          Sign In
        </button>
      </SignInButton>
    ),
  };

  return (
    <AppAuthContext.Provider value={authValue}>
      {children}
    </AppAuthContext.Provider>
  );
};

// Mock Auth Provider when Clerk key is missing
const MockAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mockUser, setMockUser] = useState<string | null>(() => {
    try {
      return localStorage.getItem("pattern-studio-mock-user");
    } catch {
      return null;
    }
  });

  const handleLogin = () => {
    const name = prompt("Enter guest username to simulate account login:");
    if (name && name.trim()) {
      const cleanName = name.trim();
      localStorage.setItem("pattern-studio-mock-user", cleanName);
      setMockUser(cleanName);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("pattern-studio-mock-user");
    setMockUser(null);
  };

  const authValue: AppAuthContextType = {
    isSignedIn: !!mockUser,
    userId: mockUser ? `mock_${mockUser.toLowerCase().replace(/\s+/g, "_")}` : null,
    userName: mockUser,
    userEmail: mockUser ? `${mockUser.toLowerCase()}@example.com` : null,
    getToken: async () => "mock-session-token",
    AuthUI: mockUser ? (
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 13, color: "var(--muted-2)" }}>
          ☁️ Guest: {mockUser}
        </span>
        <button className="link-btn" onClick={handleLogout} style={{ fontSize: 13, padding: "4px 8px" }}>
          Sign Out
        </button>
      </div>
    ) : (
      <button className="link-btn" onClick={handleLogin} style={{ fontSize: 14 }}>
        Sign In (Guest)
      </button>
    ),
  };

  return (
    <AppAuthContext.Provider value={authValue}>
      {children}
    </AppAuthContext.Provider>
  );
};

export const AppAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (isClerkEnabled) {
    const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY!;
    return (
      <ClerkProvider publishableKey={publishableKey}>
        <ClerkAuthWrapper>{children}</ClerkAuthWrapper>
      </ClerkProvider>
    );
  }

  return <MockAuthProvider>{children}</MockAuthProvider>;
};

export const useAppAuth = () => {
  const context = useContext(AppAuthContext);
  if (!context) {
    throw new Error("useAppAuth must be used within an AppAuthProvider");
  }
  return context;
};

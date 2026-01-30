import { useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";

import { useAuthCallbacks } from "./use-auth-callbacks";

type AuthMode = "login" | "signup";

export const useEmailAuth = (mode: AuthMode) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const { handleSuccess: handleLoginSuccess, handleError: handleAuthError } =
    useAuthCallbacks({
      setLoading,
      successMessage: "Logged in successfully",
      redirectUrl: "/",
    });

  const { handleSuccess: handleSignupSuccess } = useAuthCallbacks({
    setLoading,
    successMessage: "Account created successfully",
    redirectUrl: "/",
    onError: (context) => {
      handleAuthError(context);
    }, // Re-use error handler
  });

  const submit = async () => {
    setLoading(true);
    try {
      await (mode === "login"
        ? authClient.signIn.email(
            {
              email,
              password,
              callbackURL: "/",
            },
            {
              onSuccess: handleLoginSuccess,
              onError: handleAuthError,
            },
          )
        : authClient.signUp.email(
            {
              email,
              password,
              name,
              callbackURL: "/",
            },
            {
              onSuccess: handleSignupSuccess,
              onError: handleAuthError,
            },
          ));
    } catch (error) {
      setLoading(false);
      toast.error("An unexpected error occurred");
      // eslint-disable-next-line no-console
      console.error(error);
    }
  };

  return {
    email,
    setEmail,
    password,
    setPassword,
    name,
    setName,
    loading,
    submit,
  };
};

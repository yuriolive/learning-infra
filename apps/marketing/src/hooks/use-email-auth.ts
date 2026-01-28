import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";

type AuthMode = "login" | "signup";

export const useEmailAuth = (mode: AuthMode) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const submit = async () => {
    setLoading(true);
    try {
      if (mode === "login") {
        await authClient.signIn.email(
          {
            email,
            password,
            callbackURL: "/",
          },
          {
            onSuccess: () => {
              setLoading(false);
              toast.success("Logged in successfully");
              router.push("/");
            },
            onError: (ctx) => {
              setLoading(false);
              toast.error(ctx.error.message);
            },
          }
        );
      } else {
        await authClient.signUp.email(
          {
            email,
            password,
            name,
            callbackURL: "/",
          },
          {
            onSuccess: () => {
              setLoading(false);
              toast.success("Account created successfully");
              router.push("/");
            },
            onError: (ctx) => {
              setLoading(false);
              toast.error(ctx.error.message);
            },
          }
        );
      }
    } catch (error) {
      setLoading(false);
      toast.error("An unexpected error occurred");
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

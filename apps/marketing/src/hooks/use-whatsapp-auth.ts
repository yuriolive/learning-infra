import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";

export const useWhatsAppAuth = () => {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const sendOtp = async () => {
    setLoading(true);
    await authClient.phoneNumber.sendOtp(
      {
        phoneNumber: phone,
      },
      {
        onSuccess: () => {
          setLoading(false);
          setOtpSent(true);
          toast.success("OTP sent successfully");
        },
        onError: (ctx) => {
          setLoading(false);
          toast.error(ctx.error.message);
        },
      }
    );
  };

  const verifyOtp = async () => {
    setLoading(true);
    await authClient.phoneNumber.verify(
      {
        phoneNumber: phone,
        code: otp,
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
  };

  const reset = () => {
    setOtpSent(false);
    setOtp("");
  };

  return {
    phone,
    setPhone,
    otp,
    setOtp,
    otpSent,
    loading,
    sendOtp,
    verifyOtp,
    reset,
  };
};

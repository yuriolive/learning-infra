import { useState } from "react";

import { authClient } from "@/lib/auth-client";

import { useAuthCallbacks } from "./use-auth-callbacks";

export const useWhatsAppAuth = () => {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    handleSuccess: handleSendOtpSuccess,
    handleError: handleSendOtpError,
  } = useAuthCallbacks({
    setLoading,
    successMessage: "OTP sent successfully",
    redirectUrl: "", // No redirect on send OTP
    onSuccess: () => {
      setOtpSent(true);
    },
  });

  const { handleSuccess: handleVerifySuccess, handleError: handleVerifyError } =
    useAuthCallbacks({
      setLoading,
      successMessage: "Logged in successfully",
      redirectUrl: "/",
    });

  const sendOtp = async () => {
    setLoading(true);
    await authClient.phoneNumber.sendOtp(
      {
        phoneNumber: phone,
      },
      {
        onSuccess: handleSendOtpSuccess,
        onError: handleSendOtpError,
      },
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
        onSuccess: handleVerifySuccess,
        onError: handleVerifyError,
      },
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

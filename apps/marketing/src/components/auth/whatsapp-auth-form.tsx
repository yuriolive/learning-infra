"use client";

import { Button, Input, Link } from "@heroui/react";

import { useWhatsAppAuth } from "../../hooks/use-whatsapp-auth";

export const WhatsAppAuthForm = () => {
  const {
    phone,
    setPhone,
    otp,
    setOtp,
    otpSent,
    loading,
    sendOtp,
    verifyOtp,
    reset,
  } = useWhatsAppAuth();

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (otpSent) {
          void verifyOtp();
        } else {
          void sendOtp();
        }
      }}
    >
      <Input
        label="Phone Number"
        placeholder="+1234567890"
        type="tel"
        variant="bordered"
        value={phone}
        onValueChange={setPhone}
        isDisabled={otpSent}
      />
      {otpSent && (
        <Input
          label="Verification Code"
          placeholder="123456"
          type="text"
          variant="bordered"
          value={otp}
          onValueChange={setOtp}
        />
      )}
      <Button
        color="primary"
        fullWidth
        size="lg"
        type="submit"
        isLoading={loading}
      >
        {otpSent ? "Verify & Login" : "Send Code"}
      </Button>
      {otpSent && (
        <div className="flex justify-center">
          <Link
            size="sm"
            className="cursor-pointer"
            onPress={() => {
              reset();
            }}
          >
            Change phone number
          </Link>
        </div>
      )}
    </form>
  );
};

import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface UseAuthCallbacksProps {
  setLoading: (loading: boolean) => void;
  successMessage?: string;
  redirectUrl?: string;
  onSuccess?: () => void;
  onError?: (ctx: { error: { message: string } }) => void;
}

export const useAuthCallbacks = ({
  setLoading,
  successMessage,
  redirectUrl = "/",
  onSuccess,
  onError,
}: UseAuthCallbacksProps) => {
  const router = useRouter();

  const handleSuccess = () => {
    setLoading(false);
    if (successMessage) {
      toast.success(successMessage);
    }
    if (onSuccess) {
      onSuccess();
    }
    router.push(redirectUrl);
  };

  const handleError = (ctx: { error: { message: string } }) => {
    setLoading(false);
    toast.error(ctx.error.message);
    if (onError) {
      onError(ctx);
    }
  };

  return {
    handleSuccess,
    handleError,
  };
};

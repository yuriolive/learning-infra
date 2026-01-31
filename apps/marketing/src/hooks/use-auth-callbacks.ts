import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface UseAuthCallbacksProperties {
  setLoading: (loading: boolean) => void;
  successMessage?: string;
  redirectUrl?: string;
  onSuccess?: () => void;
  onError?: (context: { error: { message: string } }) => void;
}

export const useAuthCallbacks = ({
  setLoading,
  successMessage,
  redirectUrl = "/",
  onSuccess,
  onError,
}: UseAuthCallbacksProperties) => {
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

  const handleError = (context: { error: { message: string } }) => {
    setLoading(false);
    toast.error(context.error.message);
    if (onError) {
      onError(context);
    }
  };

  return {
    handleSuccess,
    handleError,
  };
};

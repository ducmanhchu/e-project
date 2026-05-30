import { useQuery } from "@tanstack/react-query";

import { useAuthStore } from "@/shared/store/use-auth-store";
import { getWalletBalance } from "@/shared/api/wallet";

export const useBalance = () => {
	const accessToken = useAuthStore((s) => s.accessToken);

	return useQuery({
		queryKey: ["wallet", "balance"],
		queryFn: getWalletBalance,
		enabled: !!accessToken,
	});
};

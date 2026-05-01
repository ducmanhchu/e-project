import { useQuery } from "@tanstack/react-query";

import { useAuthStore } from "@/shared/store/use-auth-store";
import { fetchMe } from "@/shared/api/auth";

export const useFetchMe = () => {
	const accessToken = useAuthStore((s) => s.accessToken);

	return useQuery({
		queryKey: ["auth", "me"],
		queryFn: fetchMe,
		enabled: !!accessToken,
		staleTime: 5 * 60 * 1000,
	});
};

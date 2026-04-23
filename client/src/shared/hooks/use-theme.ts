import { useThemeStore } from "@/shared/store/use-theme-store";

export function useTheme() {
	const theme = useThemeStore((s) => s.theme);
	const setTheme = useThemeStore((s) => s.setTheme);
	const toggleTheme = useThemeStore((s) => s.toggleTheme);

	return { theme, setTheme, toggleTheme } as const;
}

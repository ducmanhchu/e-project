import { useCallback, useEffect, useState } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "theme";

function getSystemTheme(): Theme {
	return window.matchMedia("(prefers-color-scheme: dark)").matches
		? "dark"
		: "light";
}

function getStoredTheme(): Theme {
	return (localStorage.getItem(STORAGE_KEY) as Theme) ?? getSystemTheme();
}

function applyTheme(theme: Theme) {
	document.documentElement.classList.toggle("dark", theme === "dark");
}

export function useTheme() {
	const [theme, setThemeState] = useState<Theme>(getStoredTheme);

	useEffect(() => {
		applyTheme(theme);
	}, [theme]);

	const setTheme = useCallback((t: Theme) => {
		localStorage.setItem(STORAGE_KEY, t);
		setThemeState(t);
	}, []);

	const toggleTheme = useCallback(() => {
		setTheme(theme === "light" ? "dark" : "light");
	}, [theme, setTheme]);

	return { theme, setTheme, toggleTheme } as const;
}

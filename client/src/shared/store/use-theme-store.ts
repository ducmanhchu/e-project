import { create } from "zustand";

export type Theme = "light" | "dark";

const STORAGE_KEY = "theme";

function getSystemTheme(): Theme {
	return window.matchMedia("(prefers-color-scheme: dark)").matches
		? "dark"
		: "light";
}

function getStoredTheme(): Theme | null {
	const value = localStorage.getItem(STORAGE_KEY);
	return value === "light" || value === "dark" ? value : null;
}

function applyTheme(theme: Theme): void {
	document.documentElement.classList.toggle("dark", theme === "dark");
}

interface ThemeState {
	theme: Theme;
	hasUserPreference: boolean;
	setTheme: (theme: Theme) => void;
	toggleTheme: () => void;
}

const storedTheme = getStoredTheme();

export const useThemeStore = create<ThemeState>((set, get) => ({
	theme: storedTheme ?? getSystemTheme(),
	hasUserPreference: storedTheme !== null,

	setTheme: (theme) => {
		localStorage.setItem(STORAGE_KEY, theme);
		applyTheme(theme);
		set({ theme, hasUserPreference: true });
	},

	toggleTheme: () => {
		const next: Theme = get().theme === "light" ? "dark" : "light";
		get().setTheme(next);
	},
}));

const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
mediaQuery.addEventListener("change", (event) => {
	if (useThemeStore.getState().hasUserPreference) return;
	const next: Theme = event.matches ? "dark" : "light";
	applyTheme(next);
	useThemeStore.setState({ theme: next });
});

window.addEventListener("storage", (event) => {
	if (event.key !== STORAGE_KEY) return;
	const value = event.newValue;
	const hasPref = value === "light" || value === "dark";
	const next: Theme = hasPref ? value : getSystemTheme();
	applyTheme(next);
	useThemeStore.setState({ theme: next, hasUserPreference: hasPref });
});

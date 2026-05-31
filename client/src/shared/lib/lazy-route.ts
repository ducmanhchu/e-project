import type { ComponentType } from "react";

/**
 * Tạo route lazy cho React Router — tách page thành chunk riêng khi navigate.
 * @param importFn - Hàm dynamic import module page
 * @param exportName - Tên export component trong module
 * @returns Object `{ lazy }` gắn vào RouteObject
 */
export function lazyRoute<
	M extends Record<string, ComponentType<unknown>>,
	K extends keyof M,
>(importFn: () => Promise<M>, exportName: K) {
	return {
		lazy: async () => {
			const mod = await importFn();
			const Component = mod[exportName];
			if (!Component) {
				throw new Error(`Export "${String(exportName)}" not found`);
			}
			return { Component };
		},
	};
}

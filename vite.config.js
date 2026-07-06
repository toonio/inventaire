import { defineConfig } from 'vitest/config';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) => filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			// GitHub Pages has no server-side routing: it serves 404.html for any
				// unmatched path, so that's what needs to be the SPA fallback page
				// (not index.html, which GitHub Pages has no special-case for).
				adapter: adapter({ fallback: '404.html' }),
			// GitHub Pages project sites are served from /<repo-name>/, not /.
			// Set BASE_PATH (e.g. "/inventaire") only for that build; leave unset
			// for local dev and other static hosts that serve from the root.
			paths: { base: process.env.BASE_PATH ?? '' }
		})
	],
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.js',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});

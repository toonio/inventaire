<script>
	import favicon from '$lib/assets/favicon.svg';
	import '$lib/app.css';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import { auth, isSignedIn } from '$lib/stores/auth.svelte.js';
	import { signIn, signOut } from '$lib/google/auth.js';
	import { saveSettings } from '$lib/stores/settings.svelte.js';

	let { children } = $props();

	$effect(() => {
		saveSettings();
	});

	let authError = $state('');

	async function handleAuthClick() {
		authError = '';
		try {
			if (isSignedIn()) {
				signOut();
			} else {
				await signIn();
			}
		} catch (err) {
			authError = err.message;
		}
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Inventaire</title>
</svelte:head>

<div class="app-shell">
	<header class="app-header">
		<span class="app-title">Inventaire</span>
		<div class="row">
			{#if isSignedIn()}
				<span class="muted">{auth.email ?? auth.name}</span>
			{/if}
			<button class="btn" onclick={handleAuthClick}>
				{isSignedIn() ? 'Se déconnecter' : 'Se connecter'}
			</button>
		</div>
	</header>

	<main class="app-main">
		{#if authError}
			<p class="error-banner">{authError}</p>
		{/if}
		{@render children()}
	</main>

	<BottomNav />
</div>

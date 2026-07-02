<script>
	import favicon from '$lib/assets/favicon.svg';
	import '$lib/app.css';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import { auth, isSignedIn } from '$lib/stores/auth.svelte.js';
	import { signIn, signOut } from '$lib/google/auth.js';
	import { settings, saveSettings, isConfigured } from '$lib/stores/settings.svelte.js';
	import { personFilter, setPersonFilter, clearPersonFilter } from '$lib/stores/personFilter.svelte.js';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';

	let { children } = $props();

	$effect(() => {
		saveSettings();
	});

	let authError = $state('');
	let titleMenuOpen = $state(false);

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

	function selectPerson(name) {
		setPersonFilter(name);
		titleMenuOpen = false;
		goto(`${base}/`);
	}

	function selectAllItems() {
		clearPersonFilter();
		titleMenuOpen = false;
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Inventaire</title>
</svelte:head>

<svelte:window onclick={() => (titleMenuOpen = false)} />

<div class="app-shell">
	<header class="app-header">
		<div class="title-menu">
			{#if isSignedIn() && isConfigured() && settings.people.length}
				<button
					type="button"
					class="app-title-btn"
					onclick={(e) => {
						e.stopPropagation();
						titleMenuOpen = !titleMenuOpen;
					}}
					aria-haspopup="true"
					aria-expanded={titleMenuOpen}
				>
					<span class="app-title">Inventaire</span>
					{#if personFilter.name}<span class="muted">— {personFilter.name}</span>{/if}
					<span class="caret">▾</span>
				</button>
				{#if titleMenuOpen}
					<div class="title-dropdown" onclick={(e) => e.stopPropagation()} role="presentation">
						<button
							type="button"
							class="dropdown-item"
							class:active={!personFilter.name}
							onclick={selectAllItems}
						>
							Tous les objets
						</button>
						{#each settings.people as person (person.name)}
							<button
								type="button"
								class="dropdown-item"
								class:active={personFilter.name === person.name}
								onclick={() => selectPerson(person.name)}
							>
								{person.name}
							</button>
						{/each}
					</div>
				{/if}
			{:else}
				<span class="app-title">Inventaire</span>
			{/if}
		</div>
		<div class="row header-user-row">
			{#if isSignedIn()}
				<span class="muted user-email">{auth.email ?? auth.name}</span>
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

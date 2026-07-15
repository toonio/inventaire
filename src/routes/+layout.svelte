<script>
	import favicon from '$lib/assets/favicon.svg';
	import '$lib/app.css';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import { auth, isSignedIn } from '$lib/stores/auth.svelte.js';
	import { signIn, signOut } from '$lib/google/auth.js';
	import { settings, saveSettings, isConfigured } from '$lib/stores/settings.svelte.js';
	import {
		personFilter,
		setAttributionFilter,
		setUnreviewedFilter,
		clearPersonFilter,
		OTHER_FILTER
	} from '$lib/stores/personFilter.svelte.js';
	import { getReviewCounts } from '$lib/inventory.js';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';

	let { children } = $props();

	$effect(() => {
		saveSettings();
	});

	let authError = $state('');
	let titleMenuOpen = $state(false);
	let openSubmenu = $state(null);
	let reviewCounts = $state(null);
	let reviewCountsLoading = $state(false);

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

	function selectAttributed(name) {
		setAttributionFilter(name);
		titleMenuOpen = false;
		openSubmenu = null;
		goto(`${base}/`);
	}

	function selectUnreviewed(name) {
		setUnreviewedFilter(name);
		titleMenuOpen = false;
		openSubmenu = null;
		goto(`${base}/`);
	}

	function selectAllItems() {
		clearPersonFilter();
		titleMenuOpen = false;
		openSubmenu = null;
	}

	async function toggleSubmenu(key) {
		const wasOpen = openSubmenu === key;
		openSubmenu = wasOpen ? null : key;
		if (!wasOpen && key === 'unreviewed') {
			reviewCountsLoading = true;
			try {
				reviewCounts = await getReviewCounts(auth.accessToken);
			} catch {
				reviewCounts = null;
			} finally {
				reviewCountsLoading = false;
			}
		}
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Inventaire</title>
</svelte:head>

<svelte:window
	onclick={() => {
		titleMenuOpen = false;
		openSubmenu = null;
	}}
/>

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
					{#if personFilter.name}
						<span class="muted">
							—
							{#if personFilter.mode === 'unreviewed'}
								Non traités : {personFilter.name}
							{:else}
								{personFilter.name === OTHER_FILTER ? 'Autres' : personFilter.name}
							{/if}
						</span>
					{/if}
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

						<button
							type="button"
							class="dropdown-item dropdown-submenu-toggle"
							aria-haspopup="true"
							aria-expanded={openSubmenu === 'attributed'}
							onclick={() => toggleSubmenu('attributed')}
						>
							Attribués
							<span class="caret">{openSubmenu === 'attributed' ? '▴' : '▾'}</span>
						</button>
						{#if openSubmenu === 'attributed'}
							<div class="dropdown-submenu">
								{#each settings.people as person (person.name)}
									<button
										type="button"
										class="dropdown-item"
										class:active={personFilter.mode === 'attributed' &&
											personFilter.name === person.name}
										onclick={() => selectAttributed(person.name)}
									>
										{person.name}
									</button>
								{/each}
								<button
									type="button"
									class="dropdown-item"
									class:active={personFilter.mode === 'attributed' &&
										personFilter.name === OTHER_FILTER}
									onclick={() => selectAttributed(OTHER_FILTER)}
								>
									Autres
								</button>
							</div>
						{/if}

						<button
							type="button"
							class="dropdown-item dropdown-submenu-toggle"
							aria-haspopup="true"
							aria-expanded={openSubmenu === 'unreviewed'}
							onclick={() => toggleSubmenu('unreviewed')}
						>
							Non traités
							<span class="caret">{openSubmenu === 'unreviewed' ? '▴' : '▾'}</span>
						</button>
						{#if openSubmenu === 'unreviewed'}
							<div class="dropdown-submenu">
								{#each settings.people as person (person.name)}
									<button
										type="button"
										class="dropdown-item dropdown-item-with-count"
										class:active={personFilter.mode === 'unreviewed' &&
											personFilter.name === person.name}
										onclick={() => selectUnreviewed(person.name)}
									>
										<span>{person.name}</span>
										<span class="count-label">
											{#if reviewCounts}
												({reviewCounts.total - reviewCounts.byPerson[person.name] ?? 0}/{reviewCounts.total})
											{:else if reviewCountsLoading}
												…
											{/if}
										</span>
									</button>
								{/each}
							</div>
						{/if}
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

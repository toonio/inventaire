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
	import {
		planAutoAttributions,
		applyAutoAttributions,
		CATALOGUE_ATTRIBUTION
	} from '$lib/autoAttribution.js';
	import { requestRefresh } from '$lib/stores/refresh.svelte.js';
	import { resolvePhotoUrl } from '$lib/google/drive.js';
	import PhotoLightbox from '$lib/components/PhotoLightbox.svelte';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';

	let { children } = $props();

	$effect(() => {
		saveSettings();
	});

	let authError = $state('');
	let titleMenuOpen = $state(false);
	let openSubmenu = $state(null);
	let recapOpen = $state(false);
	let reviewCounts = $state(null);
	let reviewCountsLoading = $state(false);
	let reviewCountsError = $state('');

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

	function toggleSubmenu(key) {
		openSubmenu = openSubmenu === key ? null : key;
	}

	/** Fetches the per-person rated/total counts on demand — kept out of the header menu itself so opening "Non traités" doesn't cost an API call per tab every time. */
	async function loadReviewCounts() {
		reviewCountsLoading = true;
		reviewCountsError = '';
		try {
			reviewCounts = await getReviewCounts(auth.accessToken);
		} catch (err) {
			reviewCountsError = err.message;
		} finally {
			reviewCountsLoading = false;
		}
	}

	function openRecap() {
		titleMenuOpen = false;
		openSubmenu = null;
		recapOpen = true;
		if (!reviewCounts) loadReviewCounts();
	}

	function closeRecap() {
		recapOpen = false;
	}

	let autoOpen = $state(false);
	let autoScanning = $state(false);
	let autoApplying = $state(false);
	let autoError = $state('');
	let autoPlan = $state(null);
	let autoApplied = $state(null);
	let autoLightbox = $state(null);

	const autoCatalogueCount = $derived(
		autoPlan?.plan.filter((e) => e.attribution === CATALOGUE_ATTRIBUTION).length ?? 0
	);
	const autoPersonCount = $derived((autoPlan?.plan.length ?? 0) - autoCatalogueCount);

	/**
	 * Scans the whole inventory and proposes the attributions that can be
	 * settled without arbitration — nothing is written until the user
	 * confirms.
	 */
	async function openAutoAttribution() {
		titleMenuOpen = false;
		openSubmenu = null;
		autoOpen = true;
		autoPlan = null;
		autoApplied = null;
		autoError = '';
		autoScanning = true;
		try {
			autoPlan = await planAutoAttributions(auth.accessToken);
		} catch (err) {
			autoError = err.message;
		} finally {
			autoScanning = false;
		}
	}

	async function confirmAutoAttribution() {
		autoApplying = true;
		autoError = '';
		try {
			const count = await applyAutoAttributions(autoPlan.plan, auth.accessToken);
			autoApplied = count;
			autoPlan = null;
			reviewCounts = null;
			requestRefresh();
		} catch (err) {
			autoError = err.message;
		} finally {
			autoApplying = false;
		}
	}

	function closeAutoAttribution() {
		autoOpen = false;
		autoLightbox = null;
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
										class="dropdown-item"
										class:active={personFilter.mode === 'unreviewed' &&
											personFilter.name === person.name}
										onclick={() => selectUnreviewed(person.name)}
									>
										{person.name}
									</button>
								{/each}
							</div>
						{/if}

						<button type="button" class="dropdown-item" onclick={openRecap}>
							Récapitulatif
						</button>

						<button type="button" class="dropdown-item" onclick={openAutoAttribution}>
							Auto-attribution
						</button>
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

{#if recapOpen}
	<div class="recap-overlay" onclick={closeRecap} role="presentation">
		<div class="recap-card" onclick={(e) => e.stopPropagation()} role="presentation">
			<h2>Récapitulatif des avis</h2>
			{#if reviewCountsError}
				<p class="error-banner">{reviewCountsError}</p>
			{:else if reviewCountsLoading}
				<p class="muted">Chargement…</p>
			{:else if reviewCounts}
				{#each settings.people as person (person.name)}
					<div class="recap-row">
						<span>{person.name}</span>
						<span class="recap-count">
							{reviewCounts.total - (reviewCounts.byPerson[person.name] ?? 0)}/{reviewCounts.total}
							non traités
						</span>
					</div>
				{/each}
			{/if}
			<div class="recap-actions">
				<button type="button" class="btn" onclick={loadReviewCounts} disabled={reviewCountsLoading}>
					Actualiser
				</button>
				<button type="button" class="btn btn-primary" onclick={closeRecap}>Fermer</button>
			</div>
		</div>
	</div>

	<PhotoLightbox photo={autoLightbox} onClose={() => (autoLightbox = null)} />
{/if}

{#if autoOpen}
	<div
		class="recap-overlay"
		onclick={() => !autoApplying && closeAutoAttribution()}
		role="presentation"
	>
		<div class="recap-card auto-card" onclick={(e) => e.stopPropagation()} role="presentation">
			<h2>Auto-attribution</h2>
			{#if autoError}<p class="error-banner">{autoError}</p>{/if}

			{#if autoScanning}
				<p class="muted">Analyse de l'inventaire…</p>
			{:else if autoApplied !== null}
				<p>
					{autoApplied} objet{autoApplied > 1 ? 's' : ''} attribué{autoApplied > 1 ? 's' : ''}.
				</p>
			{:else if autoPlan}
				{#each autoPlan.warnings as warning (warning)}
					<p class="error-banner">{warning}</p>
				{/each}
				{#if autoPlan.plan.length === 0}
					<p class="muted">
						Aucun objet à attribuer automatiquement ({autoPlan.scanned} objets analysés).
					</p>
				{:else}
					<p class="muted">
						{autoPlan.plan.length} objet{autoPlan.plan.length > 1 ? 's' : ''} sur {autoPlan.scanned}
						: {autoCatalogueCount} vers le catalogue des dons, {autoPersonCount} vers une personne.
						Les objets non notés par tout le monde et ceux voulus par plusieurs personnes sont
						laissés de côté.
					</p>
					<div class="auto-plan-list">
						{#each autoPlan.plan as entry (`${entry.tabTitle}::${entry.rowNumber}`)}
							{@const thumbUrl = resolvePhotoUrl(entry.photo)}
							<div class="recap-row">
								{#if thumbUrl}
									<button
										type="button"
										class="auto-plan-thumb"
										onclick={() =>
											(autoLightbox = {
												url: resolvePhotoUrl(entry.photo, 2048),
												alt: entry.designation || 'objet sans désignation'
											})}
										aria-label="Voir la photo en grand"
									>
										<img src={thumbUrl} alt={entry.designation} />
									</button>
								{:else}
									<span class="auto-plan-thumb auto-plan-thumb-empty"></span>
								{/if}
								<span class="auto-plan-label">
									<span class="muted">{entry.tabTitle} ·</span>
									{#if entry.itemNumber}<span class="muted">N°{entry.itemNumber} —</span>{/if}
									{entry.designation || '(sans désignation)'}
								</span>
								<span class="recap-count">{entry.attribution}</span>
							</div>
						{/each}
					</div>
				{/if}
			{/if}

			<div class="recap-actions">
				{#if autoPlan?.plan.length && autoApplied === null}
					<button type="button" class="btn" onclick={closeAutoAttribution} disabled={autoApplying}>
						Annuler
					</button>
					<button
						type="button"
						class="btn btn-primary"
						onclick={confirmAutoAttribution}
						disabled={autoApplying}
					>
						{autoApplying ? 'Attribution…' : 'Appliquer'}
					</button>
				{:else}
					<button type="button" class="btn btn-primary" onclick={closeAutoAttribution}>
						Fermer
					</button>
				{/if}
			</div>
		</div>
	</div>

	<PhotoLightbox photo={autoLightbox} onClose={() => (autoLightbox = null)} />
{/if}

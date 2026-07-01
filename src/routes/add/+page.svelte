<script>
	import { auth, isSignedIn } from '$lib/stores/auth.svelte.js';
	import { settings, isConfigured } from '$lib/stores/settings.svelte.js';
	import { getVisibleTabs } from '$lib/inventory.js';
	import { getTabData, appendRow } from '$lib/google/sheets.js';
	import { buildColumnIndex, itemToRow } from '$lib/columnMapping.js';
	import StarRating from '$lib/components/StarRating.svelte';
	import PhotoInput from '$lib/components/PhotoInput.svelte';
	import { base } from '$app/paths';

	let tabs = $state([]);
	let selectedTab = $state('');
	let headers = $state([]);
	let loading = $state(false);
	let error = $state('');
	let success = $state('');

	function emptyForm() {
		return {
			designation: '',
			photo: '',
			comments: '',
			estimation: '',
			attribution: '',
			desires: Object.fromEntries(settings.people.map((p) => [p.name, 0]))
		};
	}

	let form = $state(emptyForm());
	let photoPreview = $state(null);

	const columnIndex = $derived(buildColumnIndex(headers, settings));

	$effect(() => {
		if (isSignedIn() && isConfigured()) {
			loadTabs();
		} else {
			tabs = [];
		}
	});

	async function loadTabs() {
		error = '';
		try {
			tabs = await getVisibleTabs(auth.accessToken);
			if (!selectedTab || !tabs.some((t) => t.title === selectedTab)) {
				selectedTab = tabs[0]?.title ?? '';
			}
			if (selectedTab) await loadHeaders(selectedTab);
		} catch (err) {
			error = err.message;
		}
	}

	async function loadHeaders(tabTitle) {
		try {
			const data = await getTabData(settings.spreadsheetId, tabTitle, auth.accessToken);
			headers = data.headers;
		} catch (err) {
			error = err.message;
		}
	}

	function selectTab(title) {
		selectedTab = title;
		loadHeaders(title);
	}

	function handlePhotoChange(result) {
		form.photo = result.formula;
		photoPreview = result.previewUrl;
	}

	async function submit() {
		if (!selectedTab) return;
		loading = true;
		error = '';
		success = '';
		try {
			const row = itemToRow(form, columnIndex, headers.length);
			await appendRow(settings.spreadsheetId, selectedTab, auth.accessToken, row);
			success = `« ${form.designation || 'Objet'} » ajouté à ${selectedTab}.`;
			form = emptyForm();
			photoPreview = null;
		} catch (err) {
			error = err.message;
		} finally {
			loading = false;
		}
	}
</script>

{#if !isSignedIn()}
	<p class="muted">Connectez-vous avec Google pour ajouter un objet.</p>
{:else if !isConfigured()}
	<p class="muted">
		Aucun classeur configuré. Rendez-vous dans <a href="{base}/settings">Réglages</a> pour indiquer
		le classeur à utiliser.
	</p>
{:else}
	{#if error}<p class="error-banner">{error}</p>{/if}
	{#if success}<p class="card">{success}</p>{/if}

	<form
		class="stack"
		onsubmit={(e) => {
			e.preventDefault();
			submit();
		}}
	>
		<div class="field">
			<label for="tab-select">Catégorie / pièce</label>
			<select id="tab-select" bind:value={selectedTab} onchange={() => selectTab(selectedTab)}>
				{#each tabs as tab (tab.sheetId)}
					<option value={tab.title}>{tab.title}</option>
				{/each}
			</select>
		</div>

		<PhotoInput previewUrl={photoPreview} onChange={handlePhotoChange} />

		<div class="field">
			<label for="designation">Désignation</label>
			<input id="designation" bind:value={form.designation} placeholder="Ex. Commode en chêne" />
		</div>

		<div class="stack">
			{#each settings.people as person (person.name)}
				<div class="row-between">
					<span>{person.name}</span>
					<StarRating
						value={form.desires[person.name]}
						onChange={(v) => (form.desires[person.name] = v)}
					/>
				</div>
			{/each}
		</div>

		<div class="field">
			<label for="comments">Commentaires</label>
			<textarea id="comments" bind:value={form.comments}></textarea>
		</div>

		<div class="field">
			<label for="estimation">Estimation (€)</label>
			<input id="estimation" bind:value={form.estimation} inputmode="decimal" />
		</div>

		<button class="btn btn-primary btn-block" type="submit" disabled={loading || !selectedTab}>
			{loading ? 'Ajout…' : 'Ajouter à l’inventaire'}
		</button>
	</form>
{/if}

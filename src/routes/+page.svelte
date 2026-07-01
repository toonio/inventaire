<script>
	import { auth, isSignedIn } from '$lib/stores/auth.svelte.js';
	import { settings, isConfigured } from '$lib/stores/settings.svelte.js';
	import { getVisibleTabs } from '$lib/inventory.js';
	import { getTabData, updateRow, deleteRow } from '$lib/google/sheets.js';
	import { buildColumnIndex, rowToItem, itemToRow } from '$lib/columnMapping.js';
	import { resolvePhotoUrl, extractFileId } from '$lib/google/drive.js';
	import { deletePreviousPhoto } from '$lib/photoUpload.js';
	import StarRating from '$lib/components/StarRating.svelte';
	import PhotoInput from '$lib/components/PhotoInput.svelte';
	import { base } from '$app/paths';

	let tabs = $state([]);
	let activeTabTitle = $state('');
	let headers = $state([]);
	let rows = $state([]);
	let loading = $state(false);
	let error = $state('');

	let editingRowNumber = $state(null);
	let draft = $state(null);
	let draftPhotoPreview = $state(null);
	let originalPhotoFileId = $state(null);

	const activeSheetId = $derived(tabs.find((t) => t.title === activeTabTitle)?.sheetId ?? null);
	const columnIndex = $derived(buildColumnIndex(headers, settings));
	const items = $derived(
		rows.map((row, i) => ({ rowNumber: i + 2, row, item: rowToItem(row, columnIndex) }))
	);

	$effect(() => {
		if (isSignedIn() && isConfigured()) {
			loadTabs();
		} else {
			tabs = [];
		}
	});

	async function loadTabs() {
		loading = true;
		error = '';
		try {
			tabs = await getVisibleTabs(auth.accessToken);
			if (!tabs.some((t) => t.title === activeTabTitle)) {
				activeTabTitle = tabs[0]?.title ?? '';
			}
			if (activeTabTitle) await loadTabData(activeTabTitle);
		} catch (err) {
			error = err.message;
		} finally {
			loading = false;
		}
	}

	async function loadTabData(tabTitle) {
		loading = true;
		error = '';
		try {
			const data = await getTabData(settings.spreadsheetId, tabTitle, auth.accessToken);
			headers = data.headers;
			rows = data.rows;
		} catch (err) {
			error = err.message;
		} finally {
			loading = false;
		}
	}

	function selectTab(title) {
		activeTabTitle = title;
		editingRowNumber = null;
		loadTabData(title);
	}

	function startEdit(entry) {
		editingRowNumber = entry.rowNumber;
		draft = { ...entry.item, desires: { ...entry.item.desires } };
		draftPhotoPreview = resolvePhotoUrl(entry.item.photo);
		originalPhotoFileId = extractFileId(entry.item.photo);
	}

	function cancelEdit() {
		editingRowNumber = null;
		draft = null;
		draftPhotoPreview = null;
		originalPhotoFileId = null;
	}

	function handlePhotoChange(result) {
		draft.photo = result.formula;
		draftPhotoPreview = result.previewUrl;
	}

	async function saveEdit(entry) {
		loading = true;
		error = '';
		try {
			const newRow = itemToRow(draft, columnIndex, headers.length, entry.row);
			await updateRow(
				settings.spreadsheetId,
				activeTabTitle,
				auth.accessToken,
				entry.rowNumber,
				newRow
			);
			const newFileId = extractFileId(draft.photo);
			if (originalPhotoFileId && originalPhotoFileId !== newFileId) {
				deletePreviousPhoto(auth.accessToken, originalPhotoFileId);
			}
			cancelEdit();
			await loadTabData(activeTabTitle);
		} catch (err) {
			error = err.message;
		} finally {
			loading = false;
		}
	}

	async function removeItem(entry) {
		if (!confirm(`Supprimer « ${entry.item.designation || 'cet objet'} » ?`)) return;
		loading = true;
		error = '';
		try {
			await deleteRow(settings.spreadsheetId, activeSheetId, auth.accessToken, entry.rowNumber);
			const fileId = extractFileId(entry.item.photo);
			deletePreviousPhoto(auth.accessToken, fileId);
			await loadTabData(activeTabTitle);
		} catch (err) {
			error = err.message;
		} finally {
			loading = false;
		}
	}
</script>

{#if !isSignedIn()}
	<p class="muted">Connectez-vous avec Google pour voir l'inventaire.</p>
{:else if !isConfigured()}
	<p class="muted">
		Aucun classeur configuré. Rendez-vous dans <a href="{base}/settings">Réglages</a> pour indiquer
		le classeur à utiliser.
	</p>
{:else}
	{#if error}<p class="error-banner">{error}</p>{/if}

	{#if tabs.length}
		<div class="tabs">
			{#each tabs as tab (tab.sheetId)}
				<button
					type="button"
					class="tab-chip"
					class:active={tab.title === activeTabTitle}
					onclick={() => selectTab(tab.title)}
				>
					{tab.title}
				</button>
			{/each}
		</div>
	{/if}

	{#if loading}<p class="muted">Chargement…</p>{/if}

	{#if headers.length && columnIndex.photo === -1}
		<p class="error-banner">
			La colonne « {settings.columns.photo} » (Photo) est introuvable dans cet onglet — les photos
			ne peuvent pas s'afficher. Vérifiez le nom de la colonne dans <a href="{base}/settings"
				>Réglages</a
			>.
		</p>
	{/if}

	<div class="stack">
		{#each items as entry (entry.rowNumber)}
			<div class="card">
				{#if editingRowNumber === entry.rowNumber}
					<div class="stack">
						{#if draft.itemNumber}<p class="muted">N°{draft.itemNumber}</p>{/if}
						<PhotoInput previewUrl={draftPhotoPreview} onChange={handlePhotoChange} />
						<div class="field">
							<label for={`designation-${entry.rowNumber}`}>Désignation</label>
							<input id={`designation-${entry.rowNumber}`} bind:value={draft.designation} />
						</div>
						{#each settings.people as person (person.name)}
							<div class="row-between">
								<span>{person.name}</span>
								<StarRating
									value={draft.desires[person.name]}
									onChange={(v) => (draft.desires[person.name] = v)}
								/>
							</div>
						{/each}
						<div class="field">
							<label for={`attribution-${entry.rowNumber}`}>Attribution</label>
							<select id={`attribution-${entry.rowNumber}`} bind:value={draft.attribution}>
								<option value="">—</option>
								{#each settings.people as person (person.name)}
									<option value={person.name}>{person.name}</option>
								{/each}
							</select>
						</div>
						<div class="row">
							<button class="btn btn-primary" onclick={() => saveEdit(entry)}>Enregistrer</button>
							<button class="btn" onclick={cancelEdit}>Annuler</button>
						</div>
					</div>
				{:else}
					<div class="row-between">
						<strong>
							{#if entry.item.itemNumber}<span class="muted">N°{entry.item.itemNumber} —</span>{/if}
							{entry.item.designation || '(sans désignation)'}
						</strong>
						<div class="row">
							<button class="btn" onclick={() => startEdit(entry)}>Modifier</button>
							<button class="btn btn-danger" onclick={() => removeItem(entry)}>Supprimer</button>
						</div>
					</div>
					{#if resolvePhotoUrl(entry.item.photo)}
						<img
							src={resolvePhotoUrl(entry.item.photo)}
							alt={entry.item.designation}
							class="photo-preview"
						/>
					{/if}
					<div class="stack">
						{#each settings.people as person (person.name)}
							<div class="row-between">
								<span>{person.name}</span>
								<StarRating value={entry.item.desires[person.name]} readonly />
							</div>
						{/each}
					</div>
					{#if entry.item.attribution}
						<p class="muted">Attribué à : {entry.item.attribution}</p>
					{/if}
				{/if}
			</div>
		{:else}
			{#if !loading}<p class="muted">Aucun objet dans cet onglet.</p>{/if}
		{/each}
	</div>
{/if}

<style>
	.photo-preview {
		width: 100%;
		max-height: 220px;
		object-fit: cover;
		border-radius: var(--radius, 12px);
		margin-bottom: 0.75rem;
	}
</style>

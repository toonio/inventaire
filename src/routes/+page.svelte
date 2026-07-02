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
	let lightbox = $state(null);

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

	/** Updates a single person's star rating immediately, without entering edit mode. */
	async function updateDesire(entry, personName, value) {
		const updatedItem = { ...entry.item, desires: { ...entry.item.desires, [personName]: value } };
		const newRow = itemToRow(updatedItem, columnIndex, headers.length, entry.row);
		const previousRow = entry.row;
		rows[entry.rowNumber - 2] = newRow;
		try {
			await updateRow(settings.spreadsheetId, activeTabTitle, auth.accessToken, entry.rowNumber, newRow);
		} catch (err) {
			rows[entry.rowNumber - 2] = previousRow;
			error = err.message;
		}
	}

	function closeLightbox() {
		lightbox = null;
	}

	function handleLightboxKeydown(e) {
		if (e.key === 'Escape') closeLightbox();
	}
</script>

<svelte:window onkeydown={handleLightboxKeydown} />

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
			<div class="card" class:attributed={Boolean(entry.item.attribution)}>
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
						<button
							type="button"
							class="photo-button"
							onclick={() =>
								(lightbox = {
									url: resolvePhotoUrl(entry.item.photo, 2048),
									alt: entry.item.designation || 'objet sans désignation'
								})}
							aria-label="Voir la photo en grand"
						>
							<img
								src={resolvePhotoUrl(entry.item.photo)}
								alt={entry.item.designation}
								class="photo-preview"
							/>
						</button>
					{/if}
					<div class="stack">
						{#each settings.people as person (person.name)}
							<div class="row-between">
								<span>{person.name}</span>
								<StarRating
									value={entry.item.desires[person.name]}
									onChange={(v) => updateDesire(entry, person.name, v)}
								/>
							</div>
						{/each}
					</div>
					{#if entry.item.attribution}
						<p class="attribution-note">Validation : {entry.item.attribution}</p>
					{/if}
				{/if}
			</div>
		{:else}
			{#if !loading}<p class="muted">Aucun objet dans cet onglet.</p>{/if}
		{/each}
	</div>
{/if}

{#if lightbox}
	<div class="lightbox" onclick={closeLightbox} role="presentation">
		<img src={lightbox.url} alt={lightbox.alt} />
	</div>
{/if}

<style>
	.card.attributed {
		background: #e9dcc4;
		border-color: #d3b688;
	}

	.attribution-note {
		font-weight: 600;
		color: var(--color-accent);
		margin: 0.5rem 0 0;
	}

	.photo-preview {
		width: 100%;
		max-height: 220px;
		object-fit: cover;
		border-radius: var(--radius, 12px);
		margin-bottom: 0.75rem;
	}

	.photo-button {
		display: block;
		width: 100%;
		padding: 0;
		border: none;
		background: none;
	}

	.lightbox {
		position: fixed;
		inset: 0;
		z-index: 100;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.85);
		padding: 1rem;
	}

	.lightbox img {
		max-width: 100%;
		max-height: 100%;
		object-fit: contain;
		border-radius: 4px;
	}
</style>

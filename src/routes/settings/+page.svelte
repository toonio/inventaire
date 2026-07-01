<script>
	import { auth, isSignedIn } from '$lib/stores/auth.svelte.js';
	import { signIn, signOut } from '$lib/google/auth.js';
	import { settings, saveSettings } from '$lib/stores/settings.svelte.js';
	import { listTabs } from '$lib/google/sheets.js';
	import { openSpreadsheetPicker } from '$lib/google/picker.js';

	let error = $state('');
	let loadingTabs = $state(false);
	let availableTabs = $state([]);

	function extractSpreadsheetId(input) {
		const match = input.match(/\/d\/([a-zA-Z0-9-_]+)/);
		return match ? match[1] : input.trim();
	}

	function normalizeSpreadsheetId() {
		settings.spreadsheetId = extractSpreadsheetId(settings.spreadsheetId);
		settings.spreadsheetName = '';
	}

	async function pickSpreadsheet() {
		error = '';
		try {
			await openSpreadsheetPicker({
				accessToken: auth.accessToken,
				onPicked: (doc) => {
					settings.spreadsheetId = doc.id;
					settings.spreadsheetName = doc.name;
					availableTabs = [];
					settings.includedTabs = null;
					loadTabs();
				}
			});
		} catch (err) {
			error = err.message;
		}
	}

	async function loadTabs() {
		if (!settings.spreadsheetId) return;
		loadingTabs = true;
		error = '';
		try {
			availableTabs = await listTabs(settings.spreadsheetId, auth.accessToken);
			if (!settings.includedTabs) {
				settings.includedTabs = availableTabs.map((t) => t.title);
			}
		} catch (err) {
			error = err.message;
		} finally {
			loadingTabs = false;
		}
	}

	function toggleTab(title) {
		if (!settings.includedTabs) settings.includedTabs = availableTabs.map((t) => t.title);
		const idx = settings.includedTabs.indexOf(title);
		if (idx >= 0) settings.includedTabs.splice(idx, 1);
		else settings.includedTabs.push(title);
	}

	function addPerson() {
		settings.people.push({ name: '', column: '' });
	}

	function removePerson(index) {
		settings.people.splice(index, 1);
	}

	async function handleAuthClick() {
		error = '';
		try {
			if (isSignedIn()) signOut();
			else await signIn();
		} catch (err) {
			error = err.message;
		}
	}
</script>

<div class="stack">
	{#if error}<p class="error-banner">{error}</p>{/if}

	<div class="card stack">
		<h2>Compte Google</h2>
		{#if isSignedIn()}
			<p>Connecté en tant que <strong>{auth.email ?? auth.name}</strong></p>
		{:else}
			<p class="muted">Connectez-vous pour lire et modifier le classeur.</p>
		{/if}
		<button class="btn" onclick={handleAuthClick}>
			{isSignedIn() ? 'Se déconnecter' : 'Se connecter avec Google'}
		</button>
	</div>

	<div class="card stack">
		<h2>Classeur source</h2>

		{#if settings.spreadsheetName}
			<p class="muted">Classeur sélectionné : <strong>{settings.spreadsheetName}</strong></p>
		{/if}

		<button class="btn" onclick={pickSpreadsheet} disabled={!isSignedIn()}>
			🗂️ Choisir depuis Google Drive
		</button>

		<div class="field">
			<label for="spreadsheet-id">…ou collez l'ID ou l'URL du classeur</label>
			<input
				id="spreadsheet-id"
				bind:value={settings.spreadsheetId}
				onblur={normalizeSpreadsheetId}
				placeholder="https://docs.google.com/spreadsheets/d/…"
			/>
		</div>
		<button class="btn" onclick={loadTabs} disabled={!isSignedIn() || !settings.spreadsheetId}>
			{loadingTabs ? 'Chargement…' : 'Charger les onglets'}
		</button>

		{#if availableTabs.length}
			<div class="stack">
				<span class="muted">Onglets à afficher (tous par défaut) :</span>
				{#each availableTabs as tab (tab.sheetId)}
					<label class="row">
						<input
							type="checkbox"
							checked={settings.includedTabs?.includes(tab.title) ?? true}
							onchange={() => toggleTab(tab.title)}
						/>
						{tab.title}
					</label>
				{/each}
			</div>
		{/if}
	</div>

	<div class="card stack">
		<h2>Correspondance des colonnes</h2>
		<p class="muted">
			Indiquez le nom exact de l'en-tête utilisé dans le classeur pour chaque champ.
		</p>
		<div class="field">
			<label for="col-designation">Désignation</label>
			<input id="col-designation" bind:value={settings.columns.designation} />
		</div>
		<div class="field">
			<label for="col-photo">Photo</label>
			<input id="col-photo" bind:value={settings.columns.photo} />
		</div>
		<div class="field">
			<label for="col-comments">Commentaires</label>
			<input id="col-comments" bind:value={settings.columns.comments} />
		</div>
		<div class="field">
			<label for="col-estimation">Estimation</label>
			<input id="col-estimation" bind:value={settings.columns.estimation} />
		</div>
		<div class="field">
			<label for="col-attribution">Attribution</label>
			<input id="col-attribution" bind:value={settings.columns.attribution} />
		</div>
	</div>

	<div class="card stack">
		<h2>Personnes</h2>
		<p class="muted">
			Une personne par colonne de souhait (1 à 5 étoiles). Le nom de colonne peut différer du nom
			affiché.
		</p>
		{#each settings.people as person, i (i)}
			<div class="row">
				<input placeholder="Nom affiché" bind:value={person.name} />
				<input placeholder="Nom de colonne" bind:value={person.column} />
				<button class="btn btn-danger" onclick={() => removePerson(i)} aria-label="Retirer">✕</button
				>
			</div>
		{/each}
		<button class="btn" onclick={addPerson}>+ Ajouter une personne</button>
	</div>

	<button class="btn btn-primary btn-block" onclick={saveSettings}>Enregistrer les réglages</button>
</div>

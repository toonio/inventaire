<script>
	import { uploadNewPhoto, attachPickedPhoto } from '$lib/photoUpload.js';
	import { openPicker } from '$lib/google/picker.js';
	import { auth } from '$lib/stores/auth.svelte.js';

	let { previewUrl = null, onChange = () => {} } = $props();

	let busy = $state(false);
	let error = $state('');
	let cameraInput;
	let galleryInput;

	async function handleFileChange(e) {
		const file = e.target.files?.[0];
		e.target.value = '';
		if (!file) return;
		busy = true;
		error = '';
		try {
			const result = await uploadNewPhoto(auth.accessToken, file);
			onChange({ ...result, previewUrl: URL.createObjectURL(file) });
		} catch (err) {
			error = err.message;
		} finally {
			busy = false;
		}
	}

	async function handlePickExisting() {
		error = '';
		try {
			await openPicker({
				accessToken: auth.accessToken,
				onPicked: async (doc) => {
					busy = true;
					try {
						const result = await attachPickedPhoto(auth.accessToken, doc.id);
						onChange({ ...result, previewUrl: doc.url });
					} catch (err) {
						error = err.message;
					} finally {
						busy = false;
					}
				}
			});
		} catch (err) {
			error = err.message;
		}
	}
</script>

<div class="stack">
	{#if previewUrl}
		<img src={previewUrl} alt="Aperçu de l'objet" class="photo-preview" />
	{/if}

	<div class="row">
		<button type="button" class="btn" onclick={() => cameraInput.click()} disabled={busy}>
			📷 Prendre une photo
		</button>
		<button type="button" class="btn" onclick={() => galleryInput.click()} disabled={busy}>
			🖼️ Galerie
		</button>
		<button type="button" class="btn" onclick={handlePickExisting} disabled={busy}>
			🗂️ Drive
		</button>
	</div>

	<input
		bind:this={cameraInput}
		type="file"
		accept="image/*"
		capture="environment"
		hidden
		onchange={handleFileChange}
	/>
	<input bind:this={galleryInput} type="file" accept="image/*" hidden onchange={handleFileChange} />

	{#if busy}<p class="muted">Envoi de la photo…</p>{/if}
	{#if error}<p class="error-banner">{error}</p>{/if}
</div>

<style>
	.photo-preview {
		display: block;
		width: 100%;
		height: auto;
		max-height: 320px;
		object-fit: contain;
		background: var(--color-bg);
		border-radius: var(--radius, 12px);
	}
</style>

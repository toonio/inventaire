<script>
	/**
	 * Full-screen photo viewer, shared by the listing and the
	 * auto-attribution preview. `photo` is `{ url, alt }` or null when
	 * nothing is open.
	 */
	let { photo = null, onClose } = $props();

	function handleKeydown(e) {
		if (e.key === 'Escape' && photo) onClose();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if photo}
	<div class="lightbox" onclick={onClose} role="presentation">
		<img src={photo.url} alt={photo.alt} />
	</div>
{/if}

<style>
	.lightbox {
		position: fixed;
		inset: 0;
		/* Above the recap/auto-attribution overlays, which sit at 100. */
		z-index: 110;
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

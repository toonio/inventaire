<script>
	let { value = 0, max = 5, readonly = false, onChange = () => {} } = $props();

	function setValue(v) {
		if (readonly) return;
		onChange(v === Number(value) ? 0 : v);
	}
</script>

<div class="star-rating" class:readonly>
	{#each Array.from({ length: max }) as _, i (i)}
		<button
			type="button"
			class="star"
			class:filled={i < Number(value)}
			disabled={readonly}
			onclick={() => setValue(i + 1)}
			aria-label={`${i + 1} étoile(s)`}
		>
			★
		</button>
	{/each}
</div>

<style>
	.star-rating {
		display: flex;
		gap: 0.1rem;
	}
	.star {
		background: none;
		border: none;
		padding: 0.1rem;
		font-size: 1.35rem;
		line-height: 1;
		color: #ddd7cb;
	}
	.star.filled {
		color: var(--color-star, #d9a441);
	}
	.star-rating.readonly .star {
		cursor: default;
	}
</style>

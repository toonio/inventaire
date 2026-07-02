<script>
	let { value = '', max = 5, readonly = false, onChange = () => {} } = $props();

	const isSet = $derived(value !== '' && value !== null && value !== undefined);
	const numericValue = $derived(isSet ? Number(value) : 0);

	const SPECIAL_OPTIONS = [
		{ value: -3, icon: '🗑️', label: 'À jeter' },
		{ value: -2, icon: '🎁', label: 'À donner' },
		{ value: -1, icon: '💰', label: 'À vendre' }
	];

	function setValue(v) {
		if (readonly) return;
		onChange(isSet && v === numericValue ? 0 : v);
	}
</script>

<div class="star-rating" class:readonly>
	{#each SPECIAL_OPTIONS as opt (opt.value)}
		<button
			type="button"
			class="star special"
			class:active={isSet && numericValue === opt.value}
			disabled={readonly}
			onclick={() => setValue(opt.value)}
			aria-label={opt.label}
			title={opt.label}
			aria-pressed={isSet && numericValue === opt.value}
		>
			{opt.icon}
		</button>
	{/each}
	<span class="divider" aria-hidden="true"></span>
	<button
		type="button"
		class="star zero"
		class:active={isSet && numericValue === 0}
		disabled={readonly}
		onclick={() => setValue(0)}
		aria-label="Aucun intérêt (0 étoile)"
		aria-pressed={isSet && numericValue === 0}
	>
		0
	</button>
	{#each Array.from({ length: max }) as _, i (i)}
		<button
			type="button"
			class="star"
			class:filled={isSet && i < numericValue}
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
		flex-wrap: wrap;
		align-items: center;
		justify-content: flex-end;
		gap: 0.1rem;
		row-gap: 0.25rem;
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
	.star.zero {
		font-size: 0.75rem;
		font-weight: 600;
		width: 1.35rem;
		height: 1.35rem;
		border-radius: 50%;
		border: 1px solid #ddd7cb;
		color: #ddd7cb;
		margin-right: 0.15rem;
	}
	.star.zero.active {
		border-color: var(--color-star, #d9a441);
		color: var(--color-star, #d9a441);
		background: color-mix(in srgb, var(--color-star, #d9a441) 15%, transparent);
	}
	.star.special {
		font-size: 1.05rem;
		opacity: 0.4;
		filter: grayscale(1);
	}
	.star.special.active {
		opacity: 1;
		filter: none;
	}
	.divider {
		width: 1px;
		align-self: stretch;
		background: var(--color-border, #e4e0da);
		margin: 0 0.2rem;
	}
	.star-rating.readonly .star {
		cursor: default;
	}
</style>

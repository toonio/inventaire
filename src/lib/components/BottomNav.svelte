<script>
	import { page } from '$app/state';
	import { base } from '$app/paths';

	const links = [
		{ href: `${base}/`, label: 'Inventaire' },
		{ href: `${base}/add`, label: 'Ajouter' },
		{ href: `${base}/settings`, label: 'Réglages' }
	];
</script>

<nav class="app-nav">
	{#each links as link (link.href)}
		<a href={link.href} class:active={page.url.pathname === link.href}>
			{link.label}
		</a>
	{/each}
</nav>

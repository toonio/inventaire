<script>
	import { page } from '$app/state';
	import { base } from '$app/paths';
	import NavIcon from './NavIcon.svelte';

	const links = [
		{ href: `${base}/`, label: 'Inventaire', icon: 'list' },
		{ href: `${base}/add`, label: 'Ajouter', icon: 'camera' },
		{ href: `${base}/settings`, label: 'Réglages', icon: 'settings' }
	];
</script>

<nav class="app-nav">
	{#each links as link (link.href)}
		<a href={link.href} class:active={page.url.pathname === link.href}>
			<NavIcon name={link.icon} />
			{link.label}
		</a>
	{/each}
</nav>

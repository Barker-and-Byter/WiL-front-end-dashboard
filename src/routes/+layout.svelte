<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import Background from '$lib/components/Background.svelte';
	let { children } = $props();
	import "../app.css";
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>


<Background>
	
</Background>

{@render children()}
<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import Background from '$lib/components/Background.svelte';
	let { children } = $props();
	import "../../app.css";
	import { page } from "$app/state";
	import { serverManager } from '$lib/components/serverStore.svelte';	
	import dockerlogobright from '$lib/assets/docker-logo-ocean-blue.svg?raw';
	import dockerlogodim from '$lib/assets/docker-logo-deep-blue.svg?raw';
	import dockerlogowhite from '$lib/assets/docker-logo-white.svg?raw';

	const dockerlogobrightencoded = `data:image/svg+xml,${encodeURIComponent(dockerlogobright)}`;
	const dockerlogodimenconded = `data:image/svg+xml,${encodeURIComponent(dockerlogodim)}`;
	const dockerlogowhiteencoded = 	`data:image/svg+xml,${encodeURIComponent(dockerlogowhite)}`;
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>


<Background>
	
</Background>

<nav class="sticky top-0 z-10  bg-[#161719]/50 border-[hsl(0,0%,30%)] border-b border-t border-t-[hsl(0,0%,40%)] backdrop-blur-sm">
	  <div class="w-full mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex items-center justify-between text-left h-16">
      <!-- Left: Logo, Center: Nav Links, Right: Action & Mobile -->
      <a href="/home" class="text-4xl text-left font-bold text-violet-600/95">Dashi Boardi</a>
      <div class="hidden md:flex space-x-8 items-center">
	  <a href="/home" class="group relative items-center transition duration-300 text-[hsl(0,0%,70%)] hover:text-indigo-400">Home
      {#if page.url.pathname != '/'}
		<span class="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500 transition-transform duration-500 scale-x-0 group-hover:scale-x-100 origin-center"></span>
      {:else}
      <span class="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500 scale-x-100"></span>
    {/if}
  </a>
	  <div class="relative inline-block text-left group">
			<button type="button"
			class="inline-flex items-center w-full text-[hsl(0,0%,70%)] hover:text-indigo-400 focus:outline-none">
				<span>{serverManager.currentServer ?? "Servers"}</span>

      {#if page.url.pathname.includes('/servers/')}
		<span class="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500 scale-x-100"></span>
      {:else}
		<span class="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500 transition-transform duration-500 scale-x-0 group-hover:scale-x-100 origin-center"></span>
    	{/if}
			<svg class="w-4 h-4 ml-2 -mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
			<path fill-rule="evenodd" d="m10 12l-5-5h10l-5 5z"/>
			</svg>
			</button>
			<div class="absolute left-0 w-40 pt-1 origin-top-left opacity-0 invisible group-hover:opacity-100 group-hover:visible transition ease-in-out duration-300">
				<div class="bg-[hsl(0,0%,5%)] divide-y divide-gray-800 rounded-md shadow-lg border border-[hsl(0,0%,30%)]">
				<div class="py-1">

        <a href="/servers/{serverManager.server1name}"
		onclick={() => serverManager.set_current_server(serverManager.server1name)}
		class="block text-left w-full px-4 py-2 text-sm text-indigo-400 hover:bg-[hsl(0,0%,10%)]"
		>
			{serverManager.server1name}
        </a>
        <a href="/servers/{serverManager.server2name}" 
		onclick={() => serverManager.set_current_server(serverManager.server2name)}
		class="block text-left w-full px-4 py-2 text-sm text-indigo-400 hover:bg-[hsl(0,0%,10%)]">
					{serverManager.server2name}
        </a>
			</div>
			</div>
			</div>
		</div>
		{#if serverManager.containers.length > 0}
		<div class="relative inline-block text-left group">
			<button type="button" class="group relative h-5 w-24 rounded-lg block p-0 border-none bg-transparent cursor-pointer" onclick={() => console.log("hello!")}>
				<img 
				class="absolute inset-0 w-full h-full object-cover opacity-100 transition-opacity duration-300 group-hover:opacity-0 pointer-events-none" 
				src={dockerlogobrightencoded} 
				alt="Docker logo"/>

				<img 
				class="absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" 
				src={dockerlogowhiteencoded} 
				alt="Docker logo"/>


				{#if page.url.pathname.includes("/containers")}
					<span class="absolute -bottom-1.5 left-0 w-full h-0.5 bg-indigo-500 scale-x-100"></span>
				{:else}
      			<span class="absolute -bottom-1.5 left-0 w-full h-0.5 bg-indigo-500 transition-transform duration-500 scale-x-0 group-hover:scale-x-100 origin-center"></span>

					{/if}
			</button>
			<div class="absolute left-0 w-40 pt-3 origin-top-right opacity-0 invisible group-hover:opacity-100 group-hover:visible transition ease-in-out duration-300">
				<div class="bg-[hsl(0,0%,5%)] divide-y divide-gray-800 rounded-md shadow-lg border border-[hsl(0,0%,30%)]">
				<div class="py-1">

				<a href="/containers/"
				class="block text-left w-full px-4 py-2 border-white border-b text-sm text-indigo-400 hover:bg-[hsl(0,0%,10%)]"
				>
					View All
				</a>

				{#each serverManager.containers as container}
				<a href="/containers/{container.name}">
				<button type="button"
				class="block text-left w-full px-4 py-2 text-sm text-indigo-400 hover:bg-[hsl(0,0%,10%)]"
				onclick={() => console.log(container.name)}
				>
					{container.name}
				</button>
				</a>
				{/each}
			</div>
			</div>
			</div>

		</div>
		{:else}
			<img 
			class="relative h-5 w-24 rounded-lg block p-0 opacity-50 bg-transparent" 
			src={dockerlogowhiteencoded} 
			alt="Docker logo"/>

		{/if}
		<padding>10</padding>

      </div>
    </div>
  </div>
</nav>
{@render children()}
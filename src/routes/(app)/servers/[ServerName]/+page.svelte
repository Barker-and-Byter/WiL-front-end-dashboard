
<script lang="ts">
	import { Area, Arc, Chart, ClipPath, Group, Layer, Line, LinearGradient, Text, PieChart } from 'layerchart';
	import { scaleLinear, scaleThreshold } from 'd3-scale';
	import { SpringValue } from 'svelte-ux';
	import { curveCatmullRom } from 'd3-shape';
	import { AreaChart, defaultChartPadding } from 'layerchart';
	import { cls } from '@layerstack/tailwind';
    import { onDestroy, onMount, untrack } from 'svelte';
	import { PUBLIC_EVENT_SOURCE_ONE, PUBLIC_EVENT_SOURCE_TWO } from '$env/static/public';
	import { serverManager } from '$lib/components/serverStore.svelte';
	import dockerlogobright from '$lib/assets/docker-logo-ocean-blue.svg?raw';
	import dockerlogodim from '$lib/assets/docker-logo-deep-blue.svg?raw';
	import dockerlogowhite from '$lib/assets/docker-logo-white.svg?raw';
    import { page } from '$app/state';

	const dockerlogobrightencoded = `data:image/svg+xml,${encodeURIComponent(dockerlogobright)}`;
	const dockerlogodimenconded = `data:image/svg+xml,${encodeURIComponent(dockerlogodim)}`;
	const dockerlogowhiteencoded = 	`data:image/svg+xml,${encodeURIComponent(dockerlogowhite)}`;

	interface ContainerStats {
    name: string;
    dock_cpu_perc: number;
    dock_ram_perc: number;
    dock_net_io: string;
    dock_block_io: string;
	}


	let CPUvalue = $state(0);
    let RAMvalue = $state(0);
	let driveValue = $state(0);
	let upSpeed = $state(0);
	let downSpeed = $state(0);
	let writeSpeed = $state(0);
	let readSpeed = $state(0);
	let displayDown = $state(0);
	let displayUp = $state(0);
	let hostname = $state("");

	const storageData = $state([
		{ label: 'Used', value: 273.5 },
		{ label: 'Free', value: 700.26 }
	]);

	const RAMdata = $state([
		{ label: 'Used', value: 273.5 },
		{ label: 'Free', value: 700.26 }
	])

	let CPUDataGraph = $state(
		Array.from({ length: 60}, (_, i) => ({ time : i, value: 0}))
	);

	let RAMDataGraph = $state(
		Array.from({ length: 60}, (_, i) => ({ time : i, value: 0}))
	);

	let downDataGraph = $state(
		Array.from({ length: 60}, (_, i) => ({ time : i, value: 0}))
	);

	let upDataGraph = $state(
		Array.from({ length: 60}, (_, i) => ({ time : i, value: 0}))
	);

	let writeDataGraph = $state(
		Array.from({ length: 60}, (_, i) => ({ time : i, value: 0}))
	);

	let readDataGraph = $state(
		Array.from({ length: 60}, (_, i) => ({ time : i, value: 0}))
	);

	// 
	let eventsource: EventSource;
	let totalNetwork = $state(0);

	let isLoading = $state(true);

	//coloring information

	let latency = $state(0);

	const fruitColors = ['oklch(63.7% 0.237 25.331)', 'oklch(69.6% 0.17 162.48)'];

	let eventSource: EventSource;


	function startReceiving(eventSource: EventSource) {

		eventSource.onmessage = (event) => {
			untrack(() => {
			const data = JSON.parse(event.data);
			hostname = data.hostname;
			if (isLoading) {
				isLoading = false;
			}
			const localTime = Date.now();
			latency = localTime - data.timestamp;
			latency = Math.abs(latency);
			CPUvalue = Number(data.cpuUsage);
			CPUDataGraph = [
  				...CPUDataGraph.slice(1).map(point => ({ ...point, time: point.time - 1 })),
  				{ time: 60, value: CPUvalue }
				];
			RAMvalue = Number(data.ramUsage);
			RAMDataGraph = [
  				...RAMDataGraph.slice(1).map(point => ({ ...point, time: point.time - 1 })),
  				{ time: 60, value: RAMvalue }
				];

			driveValue = Number(data.driveUsage);
			storageData[0].value = Number(data.driveUsed);
			storageData[1].value = Number(data.driveFree);
			RAMdata[0].value = Number(data.ramUsed);
			RAMdata[1].value = Number(data.ramFree);
			upSpeed = data.uploadSpeed;
			downSpeed = data.downSpeed;
			downDataGraph = [
  				...downDataGraph.slice(1).map(point => ({ ...point, time: point.time - 1 })),
  				{ time: 60, value: downSpeed }
				];
			upDataGraph = [
  				...upDataGraph.slice(1).map(point => ({ ...point, time: point.time - 1 })),
  				{ time: 60, value: upSpeed }
				];
			writeSpeed = data.written;
			readSpeed = data.read;
			writeDataGraph = [
  				...writeDataGraph.slice(1).map(point => ({ ...point, time: point.time - 1 })),
  				{ time: 60, value: writeSpeed }
				];
			readDataGraph = [
  				...readDataGraph.slice(1).map(point => ({ ...point, time: point.time - 1 })),
  				{ time: 60, value: readSpeed }
				];

			displayDown = Number((downSpeed >= 1024 ? downSpeed / (1024) : downSpeed).toFixed(2));
			displayUp = Number((upSpeed >= 1024 ? upSpeed / (1024) : upSpeed).toFixed(2));
			serverManager.containers = data.containers;
		});
		};
		eventSource.onerror = (err) =>{
			console.error("eventSource failed:", err);
		};
	}
	let server = $state('Servers');
//function that resets any graphs
function reset(){
	if ( eventsource ) {
		eventsource.close();
		isLoading = true;
	}
	CPUDataGraph = (
		Array.from({ length: 60}, (_, i) => ({ time : i, value: 0}))
	);

	RAMDataGraph = (
		Array.from({ length: 60}, (_, i) => ({ time : i, value: 0}))
	);

	downDataGraph = (
		Array.from({ length: 60}, (_, i) => ({ time : i, value: 0}))
	);

	upDataGraph = (
		Array.from({ length: 60}, (_, i) => ({ time : i, value: 0}))
	);

	writeDataGraph = (
		Array.from({ length: 60}, (_, i) => ({ time : i, value: 0}))
	);

	readDataGraph = (
		Array.from({ length: 60}, (_, i) => ({ time : i, value: 0}))
	);
}

async function init() {
  eventsource = new EventSource("/api/stream");
  startReceiving(eventsource);
}



$effect(() =>{
    if (!serverManager.currentServer) return;

    reset();

    if (eventsource) {
        eventsource.close();
    }

    if (serverManager.server1name === serverManager.currentServer){
		init()
    } else if (serverManager.server2name === serverManager.currentServer){
        eventsource = new EventSource(PUBLIC_EVENT_SOURCE_TWO + "/data-stream");
		startReceiving(eventsource);
	}

    

    return (() => {
        if (eventsource){
            eventsource.close();
        }
    });
});

</script>
<!--Navigation bar-->
<main>



<div class="pb-20"></div>

<div class="grid grid-cols-5 max-w-440 mx-auto justify-center gap-4 pl-10 pr-10">

	{#if isLoading}
		<div class="shadow-lg max-w-80 aspect-square bg-zinc-500 animate-pulse rounded-lg justify-center items-center flex flex-col">
		<span class="text-sm  text-white/0 bg-zinc-300 animate-pulse"> CPU usage%</span>
		    <div class="relative w-3/5 h-3/5 flex items-center justify-center">
                <svg class="w-full h-full animate-pulse text-zinc-300" viewBox="0 0 100 100">
                    <circle 
                        cx="50" 
                        cy="50" 
                        r="40" 
                        fill="transparent" 
                        stroke="currentColor" 
                        stroke-width="8" 
                    />
                </svg>
                <!-- <div class="absolute h-10 w-16 bg-zinc-300 animate-pulse rounded"></div> -->
            </div>
        </div>
	{:else}
	<div class="shadow-lg max-w-80 backdrop-blur-lg aspect-square card-hover-animate border border-[hsl(0,0%,30%)] rounded-lg justify-center items-center flex flex-col">
	<span class="text-xl sm:text-lg text-[hsl(0,0%,95%)]"> CPU usage%</span>
	<div class="max-h-50 min-h-40 w-full flex-1">
	<Chart padding={20}>
		<Layer center>
			<SpringValue value={CPUvalue} let:value>
				{#each { length: 25 } as _, segmentIndex}
					{@const segmentAngle = (2 * Math.PI) / 25}
					<Arc
						startAngle={segmentIndex * segmentAngle}
						endAngle={(segmentIndex + 1) * segmentAngle}
						innerRadius={-20}
						cornerRadius={4}
						padAngle={0.02}
						class={cls(
							(segmentIndex / 25) * 100 > 80 && (value ?? 0) > 80
								? `fill-red-500`
								: (segmentIndex / 25) * 100 > 80
								? `fill-red-500/10`
								: (segmentIndex / 25) * 100 < (value ?? 0)
								? `fill-emerald-500`
								: `fill-emerald-500/10`
						)}
					/>
				{/each}

				<Text
					value={Math.round(value ?? 0)}
					textAnchor="middle"
					verticalAnchor="middle"
					dy={16}
					class= {"text-4xl sm:text-2xl lg:text-6xl tabular-nums font-bold text-white"}
				/>
			</SpringValue>
		</Layer>
	</Chart>
	</div>
	</div>
	{/if}
	<!--Second chart for RAM usage-->
	{#if isLoading}
		<div class="shadow-lg max-w-80 aspect-square bg-zinc-500 animate-pulse rounded-lg  items-center justify-center flex flex-col">
		<span class="text-sm  text-white/0 bg-zinc-300 animate-pulse"> CPU usage%</span>
		    <div class="relative w-3/5 h-3/5 flex items-center justify-center">
                <svg class="w-full h-full animate-pulse text-zinc-300" viewBox="0 0 100 100">
                    <circle 
                        cx="50" 
                        cy="50" 
                        r="40" 
                        fill="transparent" 
                        stroke="currentColor" 
                        stroke-width="8" 
                    />
                </svg>
                <!-- <div class="absolute h-10 w-16 bg-zinc-300 animate-pulse rounded"></div> -->
            </div>
        </div>
	{:else}
	<div class="max-w-80 aspect-square card-hover-animate border border-[hsl(0,0%,30%)] rounded-lg items-center justify-center flex flex-col ">
		<span class="text-xl sm:text-lg text-white"> RAM usage%</span>
	<div class="max-h-50 min-h-40 w-full flex-1">
	<Chart padding={20}>
		<Layer center>
			<SpringValue value={RAMvalue} let:value>
				{#each { length: 25 } as _, segmentIndex}
					{@const segmentAngle = (2 * Math.PI) / 25}
					<Arc
						startAngle={segmentIndex * segmentAngle}
						endAngle={(segmentIndex + 1) * segmentAngle}
						innerRadius={-20}
						cornerRadius={4}
						padAngle={0.02}
						class={cls(
							(segmentIndex / 25) * 100 > 80 && (value ?? 0) > 80
								? 'fill-red-500'
								: (segmentIndex / 25) * 100 > 80
								? 'fill-red-500/10'
								: (segmentIndex / 25) * 100 < (value ?? 0)
								? 'fill-emerald-500'
								: 'fill-emerald-500/10'
						)}
					/>
				{/each}

				<Text
					value={Math.round(value ?? 0)}
					textAnchor="middle"
					verticalAnchor="middle"
					dy={16}
					class="text-4xl sm:text-2xl lg:text-6xl tabular-nums font-bold text-white"
				/>
			</SpringValue>
		</Layer>
	</Chart>
	</div>
	</div>
	{/if}
	<!--Third Gauge for Storage Usage-->
	{#if isLoading}
		<div class="shadow-lg max-w-80 aspect-square bg-zinc-500 animate-pulse rounded-lg  items-center justify-center flex flex-col">
		<span class="text-sm text-white/0 bg-zinc-300 animate-pulse"> CPU usage%</span>
		    <div class="relative w-3/5 h-3/5 flex items-center justify-center">
                <svg class="w-full h-full animate-pulse text-zinc-300" viewBox="0 0 100 100">
                    <circle 
                        cx="50" 
                        cy="50" 
                        r="40" 
                        fill="transparent" 
                        stroke="currentColor" 
                        stroke-width="8" 
                    />
                </svg>
                <!-- <div class="absolute h-10 w-16 bg-zinc-300 animate-pulse rounded"></div> -->
            </div>
        </div>
	{:else}
	<div class="max-w-80 aspect-square card-hover-animate border border-[hsl(0,0%,30%)] rounded-lg items-center justify-center flex flex-col ">
		<span class="text-xl sm:text-sm  text-white"> Storage Usage%</span>
	<div class="max-h-50 w-full min-h-40 flex-1">
	<Chart padding={20}>
		<Layer center>
			<SpringValue value={driveValue} let:value>
				{#each { length: 25 } as _, segmentIndex}
					{@const segmentAngle = (2 * Math.PI) / 25}
					<Arc
						startAngle={segmentIndex * segmentAngle}
						endAngle={(segmentIndex + 1) * segmentAngle}
						innerRadius={-20}
						cornerRadius={4}
						padAngle={0.02}
						class={cls(
							(segmentIndex / 25) * 100 > 80 && (value ?? 0) > 80
								? 'fill-red-500'
								: (segmentIndex / 25) * 100 > 80
								? 'fill-red-500/10'
								: (segmentIndex / 25) * 100 < (value ?? 0)
								? 'fill-emerald-500'
								: 'fill-emerald-500/10'
						)}
					/>
				{/each}

				<Text
					value={Math.round(value ?? 0)}
					textAnchor="middle"
					verticalAnchor="middle"
					dy={16}
					class="text-4xl sm:text-3xl lg:text-6xl tabular-nums font-bold text-white"
				/>
			</SpringValue>
		</Layer>
	</Chart>
	</div>
	</div>
	{/if}
	<!--Piechart for storage-->
	{#if isLoading}
	<div class="shadow-lg max-w-80 aspect-square bg-zinc-500 animate-pulse rounded-lg  items-center justify-center flex flex-col">
		<span class="text-xl sm:text-sm text-white/0 bg-zinc-300 animate-pulse"> CPU usage%</span>
		    <div class="relative w-3/5 h-3/5 flex items-center justify-center">
                <svg class="w-full h-full animate-pulse text-zinc-300" viewBox="0 0 100 100">
                    <circle 
                        cx="50" 
                        cy="50" 
                        r="40" 
                        fill="transparent" 
                        stroke="currentColor" 
                        stroke-width="8" 
                        stroke-dasharray="80 2.05"
                    />
                </svg>
                <!-- <div class="absolute h-10 w-16 bg-zinc-300 animate-pulse rounded"></div> -->
            </div>
        </div>
	{:else}
	<div class='max-w-80 aspect-square card-hover-animate border border-[hsl(0,0%,30%)] rounded-lg items-center justify-center flex flex-col '>
	<h1 class="text-xl sm:text-sm  text-[hsl(0,0%,95%)] pb-6"> Storage Distribution</h1>
	<div class="max-h-60 flex-1 w-full min-h-30">
		<PieChart
			data = {storageData}
			key="label"
			value="value"
			cRange={fruitColors}
			innerRadius={-20}
			cornerRadius={5}
			props={{pie: { motion: 'spring' }}}
			padAngle={0.02}
			padding={20}
		>
			{#snippet aboveMarks()}
				<Text
					value={(storageData[0].value + storageData[1].value).toFixed(2) + ' GB'}
					textAnchor="middle"
					verticalAnchor="middle"
					class="text-2xl sm:text-sm lg:text-3xl text-white"
					dy={4}
				/>
				<Text
					value="Total Storage"
					textAnchor="middle"
					verticalAnchor="middle"
					class="text-sm  fill-surface-content/50 text-white"
					dy={26}
				/>
			{/snippet}
		</PieChart>
	</div>
	</div>
	{/if}
		<!--Ram piechart-->
	{#if isLoading}
		<div class="shadow-lg max-w-80 aspect-square bg-zinc-500 animate-pulse rounded-lg  items-center justify-center flex flex-col">
		<span class="text-sm text-white/0 bg-zinc-300 animate-pulse"> CPU usage%</span>
		    <div class="relative w-3/5 h-3/5 flex items-center justify-center">
                <svg class="w-full h-full animate-pulse text-zinc-300" viewBox="0 0 100 100">
                    <circle 
                        cx="50" 
                        cy="50" 
                        r="40" 
                        fill="transparent" 
                        stroke="currentColor" 
                        stroke-width="8" 
                        stroke-dasharray="80 2.05"
                    />
                </svg>
                <!-- <div class="absolute h-10 w-16 bg-zinc-300 animate-pulse rounded"></div> -->
            </div>
        </div>
	{:else}
	<div class='max-w-80 aspect-square card-hover-animate border border-[hsl(0,0%,30%)] rounded-lg items-center justify-center flex flex-col '>
	<span class="text-sm  text-white pb-6"> RAM Distribution</span>
	<div class="max-h-60 w-full min-h-30 flex-1">
		<PieChart
			data = {RAMdata}
			key="label"
			value="value"
			cRange={fruitColors}
			innerRadius={-20}
			cornerRadius={5}
			props={{pie: { motion: 'spring' }}}
			padAngle={0.02}
			padding={20}
		>
			{#snippet aboveMarks()}
				<Text
					value={(RAMdata[0].value + RAMdata[1].value).toFixed(2) + ' GB'}
					textAnchor="middle"
					verticalAnchor="middle"
					class="text-2xl sm:text-sm lg:text-3xl  text-white"
					dy={4}
				/>
				<Text
					value="Total Memory"
					textAnchor="middle"
					verticalAnchor="middle"
					class="text-sm  fill-surface-content/50 text-white"
					dy={26}
				/>
			{/snippet}
		</PieChart>
	</div>
	</div>
	{/if}
	

	<!--Latency-->
	{#if isLoading}
		<div class="shadow-lg max-w-80 w-full aspect-square bg-zinc-500 animate-pulse rounded-lg space-y-[25%] items-center justify-center flex flex-col">
		<span class="block w-[60%] h-[10%] bg-zinc-300 animate-pulse place-content-start"></span>
		<span class="block w-[75%] h-[20%] bg-zinc-300 animate-pulse"></span>
	</div>
	{:else}
	<div class='max-w-80 aspect-square card-hover-animate border border-[hsl(0,0%,30%)] rounded-lg items-center justify-center flex flex-col '>
		<span class="text-lg xl:text-xl sm:text-sm  text-white pb-6"> Latency</span>
	<div class="max-h-50 min-h-30 w-full flex-1">
	<Chart padding={20}>
		<Layer center>
			<SpringValue value={latency} let:value>

				<Text
					value={Math.round(value ?? 0) + ' Ms'}
					textAnchor="middle"
					verticalAnchor="middle"
					dy={16}
					class="text-3xl sm:text-sm lg:text-5xl tabular-nums font-bold text-white"
				/>
			</SpringValue>
		</Layer>
	</Chart>
	</div>
	</div>
	{/if}

	<!--Upload speed raw readout-->
	{#if isLoading}
		<div class="shadow-lg max-w-80 aspect-square bg-zinc-500 animate-pulse rounded-lg space-y-[25%] items-center justify-center flex flex-col">
		<span class="block w-[60%] h-[10%] bg-zinc-300 animate-pulse place-content-start"></span>
		<span class="block w-[75%] h-[20%] bg-zinc-300 animate-pulse"></span>
	</div>
	{:else}
	<div class='max-w-80 aspect-square card-hover-animate border border-[hsl(0,0%,30%)] rounded-lg items-center justify-center flex flex-col '>
		<h1 class="text-lg xl:text-xl sm:text-sm  text-[hsl(0,0%,95%)] pb-6"> Upload speed</h1>
		<div class="max-h-50 w-full flex-1 min-h-30">
		<Chart padding={20}>
		<Layer center>
			<SpringValue value={displayUp} let:value>

				<Text
					value={((value ?? 0) >= 1024 ? ((value ?? 0)/1024).toFixed(2) : (value ?? 0).toFixed(2)) + ((value ?? 0) >= 1024  ?  'MB/s' : ' kB/s')}
					textAnchor="middle"
					verticalAnchor="middle"
					dy={16}
					class="text-xl sm:text-sm lg:text-4xl tabular-nums font-bold text-white"
				/>
			</SpringValue>
		</Layer>
	</Chart>
	</div>
	</div>
	{/if}

	<!--Download speed raw readout-->
	{#if isLoading}
		<div class="shadow-lg max-w-80 aspect-square bg-zinc-500 animate-pulse rounded-lg space-y-[25%] items-center justify-center flex flex-col">
		<span class="block w-[60%] h-[10%] bg-zinc-300 animate-pulse place-content-start"></span>
		<span class="block w-[75%] h-[20%] bg-zinc-300 animate-pulse"></span>
	</div>
	{:else}
	<div class='max-w-80 aspect-square card-hover-animate border border-[hsl(0,0%,30%)] rounded-lg items-center justify-center flex flex-col '>
		<h1 class="text-lg sm:text-sm xl:text-xl  text-white pb-6"> Download speed</h1>
		<div class="max-h-50 w-full flex-1 min-h-30">

		<Chart padding={20}>
		<Layer center>
			<SpringValue value={displayDown} let:value>

				<Text
					value={((value ?? 0) >= 1024 ? ((value ?? 0)/1024).toFixed(2) : (value ?? 0).toFixed(2)) + ((value ?? 0) >= 1024  ?  'MB/s' : ' kB/s')}
					textAnchor="middle"
					verticalAnchor="middle"
					dy={16}
					class="text-xl sm:text-sm lg:text-4xl tabular-nums font-bold text-white"
				/>
			</SpringValue>
		</Layer>
	</Chart>
	</div>
	</div>
	{/if}
	<!--Disk read speed raw readout-->
	{#if isLoading}
		<div class="shadow-lg max-w-80 aspect-square bg-zinc-500 animate-pulse rounded-lg space-y-[25%] items-center justify-center flex flex-col">
		<span class="block w-[60%] h-[10%] bg-zinc-300 animate-pulse place-content-start"></span>
		<span class="block w-[75%] h-[20%] bg-zinc-300 animate-pulse"></span>
	</div>
	{:else}
	<div class='max-w-80 aspect-square card-hover-animate border border-[hsl(0,0%,30%)] rounded-lg items-center justify-center flex flex-col '>
		<h1 class="text-lg sm:text-sm xl:text-xl  text-white pb-6"> Disk Read Speed</h1>
		<div class="max-h-50 w-full flex-1 min-h-30">

		<Chart padding={20}>
		<Layer center>
			<SpringValue value={readSpeed} let:value>

				<Text
					value={((value ?? 0) >= 1024 ? ((value ?? 0)/1024).toFixed(2) : (value ?? 0).toFixed(2)) + ((value ?? 0) >= 1024  ?  'MB/s' : ' kB/s')}
					textAnchor="middle"
					verticalAnchor="middle"
					dy={16}
					class="text-xl sm:text-sm lg:text-4xl tabular-nums font-bold text-white"
				/>
			</SpringValue>
		</Layer>
	</Chart>
	</div>
	</div>
	{/if}
	<!--Disk write speed raw readout-->
	{#if isLoading}
		<div class="shadow-lg max-w-80 aspect-square bg-zinc-500 animate-pulse rounded-lg space-y-[25%] items-center justify-center flex flex-col">
		<span class="block w-[60%] h-[10%] bg-zinc-300 animate-pulse place-content-start"></span>
		<span class="block w-[75%] h-[20%] bg-zinc-300 animate-pulse"></span>
	</div>
	{:else}
	<div class='max-w-80 aspect-square card-hover-animate border border-[hsl(0,0%,30%)] rounded-lg items-center justify-center flex flex-col '>
		<h1 class="text-lg sm:text-sm xl:text-xl  text-white pb-6"> Disk Write Speed</h1>
		<div class="max-h-50 w-full flex-1 min-h-30">

		<Chart padding={20}>
		<Layer center>
			<SpringValue value={writeSpeed} let:value>

				<Text
					value={((value ?? 0) >= 1024 ? ((value ?? 0)/1024).toFixed(2) : (value ?? 0).toFixed(2)) + ((value ?? 0) >= 1024  ?  'MB/s' : ' kB/s')}
					textAnchor="middle"
					verticalAnchor="middle"
					dy={16}
					class="text-xl sm:text-sm lg:text-4xl tabular-nums font-bold text-white"
				/>
			</SpringValue>
		</Layer>
	</Chart>
	</div>
	</div>
	{/if}


</div>



<h1 class = 'justify-center text-center font-semibold z-50  text-[hsl(0,0%,95%)] pt-20 '>&#8595; Graphs &#8595;</h1>
<div class=" justify-center flex flex-wrap gap-4 pt-20 pb-32  overflow-scroll">

<!--CPU usage graph-->
	{#if isLoading}
		<div class='w-4xl h-100 aspect-auto bg-zinc-500 p-5 rounded-lg items-center flex gap-4 flex-col text-white animate-pulse'></div>
	{:else}
	<div class='w-4xl aspect-auto card-hover-animate transition-colors duration-500 ease-in-out border border-[hsl(0,0%,35%)] p-5 rounded-lg items-center flex gap-4 flex-col text-[hsl(0,0%,95%)]'>
		<span class="text-xl text-[hsl(0,0%,95%)]">CPU %</span>
		<AreaChart
			data={CPUDataGraph}
			x="time"
			y="value"
			props={{ area: { curve: curveCatmullRom } }}
			padding={defaultChartPadding({ left: 30 })}
			height={300}
			class="text-white"
			yDomain={[0, 100]}
		>
			{#snippet marks()}
		<LinearGradient class={CPUvalue < 80 ? "from-emerald-500/50 to-emerald-500/1" : "from-red-500/50 to-red-500/1"} vertical>
			{#snippet children({ gradient })}
				<Area line={CPUvalue < 80 ? { class: 'stroke-emerald-500' } : { class: 'stroke-red-500' }} fill={gradient} />
			{/snippet}
		</LinearGradient>
	{/snippet}
	</AreaChart>
	</div>
	{/if}
	{#if isLoading}
		<div class='w-4xl h-100 aspect-auto bg-zinc-500 p-5 rounded-lg items-center flex gap-4 flex-col text-white animate-pulse'></div>
	{:else}
<!--RAM Usage Graph-->
	<div class='w-4xl aspect-auto card-hover-animate border border-[hsl(0,0%,35%)] p-5 rounded-lg items-center flex gap-4 flex-col text-[hsl(0,0%,95%)]'>
		<span class="text-xl text-[hsl(0,0%,95%)]">RAM %</span>
		<AreaChart
			data={RAMDataGraph}
			x="time"
			y="value"
			props={{ area: { curve: curveCatmullRom } }}
			padding={defaultChartPadding({ left: 30 })}
			height={300}
			yDomain={[0, 100]}
			class={'text-white'}

	>
	{#snippet marks()}
		<LinearGradient class={RAMvalue < 80 ? "from-emerald-500/50 to-emerald-500/1" : "from-red-500/50 to-red-500/1"} vertical>
			{#snippet children({ gradient })}
				<Area line={RAMvalue < 80 ? { class: 'stroke-emerald-500' } : { class: 'stroke-red-500' }} fill={gradient} />
			{/snippet}
		</LinearGradient>
	{/snippet}
	</AreaChart>
	</div>
	{/if}
	<!--Network Traffic (Rx)-->
	{#if isLoading}
		<div class='w-4xl h-100 aspect-auto bg-zinc-500 p-5 rounded-lg items-center flex gap-4 flex-col text-white animate-pulse'></div>
	{:else}
	<div class='w-4xl aspect-auto card-hover-animate border border-[hsl(0,0%,35%)] p-5 rounded-lg items-center flex gap-4 flex-col text-[hsl(0,0%,95%)]'>
		<span class="text-xl text-[hsl(0,0%,95%)]">Network traffic (rx)</span>
		<AreaChart
			data={downDataGraph}
			x="time"
			y="value"
			props={{ area: { curve: curveCatmullRom } }}
			padding={defaultChartPadding({ left: 30 })}
			height={300}
			class={'text-white'}

	>
	{#snippet marks()}
		<LinearGradient class={"from-emerald-500/50 to-emerald-500/1"} vertical>
			{#snippet children({ gradient })}
				<Area line={{ class: 'stroke-emerald-500' }} fill={gradient} />
			{/snippet}
		</LinearGradient>
	{/snippet}
	</AreaChart>
	</div>
	{/if}
		<!--Network Traffic (Tx)-->
	{#if isLoading}
		<div class='w-4xl h-100 aspect-auto bg-zinc-500 p-5 rounded-lg items-center flex gap-4 flex-col text-white animate-pulse'></div>
	{:else}
	<div class='w-4xl aspect-auto card-hover-animate border border-[hsl(0,0%,35%)] p-5 rounded-lg items-center flex gap-4 flex-col text-[hsl(0,0%,95%)]'>
		<span class="text-xl text-[hsl(0,0%,95%)]">Network traffic (Tx)</span>
		<AreaChart
			data={upDataGraph}
			x="time"
			y="value"
			props={{ area: { curve: curveCatmullRom } }}
			padding={defaultChartPadding({ left: 30 })}
			height={300}

			class={'text-white'}

	>
	{#snippet marks()}
		<LinearGradient class={"from-emerald-500/50 to-emerald-500/1"} vertical>
			{#snippet children({ gradient })}
				<Area line={{ class: 'stroke-emerald-500' }} fill={gradient} />
			{/snippet}
		</LinearGradient>
	{/snippet}
	</AreaChart>
	</div>
	{/if}
		<!--disk Kb/s-->
		{#if isLoading}
		<div class='w-4xl h-100 aspect-auto bg-zinc-500 p-5 rounded-lg items-center flex gap-4 flex-col text-white animate-pulse'></div>
		{:else}
	<div class='w-4xl aspect-auto card-hover-animate border border-[hsl(0,0%,35%)] p-5 rounded-lg items-center flex gap-4 flex-col text-[hsl(0,0%,95%)]'>
		<span class="text-xl text-[hsl(0,0%,95%)]">Disk Write speed (Kb/s)</span>
		<AreaChart
			data={writeDataGraph}
			x="time"
			y="value"
			props={{ area: { curve: curveCatmullRom } }}
			padding={defaultChartPadding({ left: 30 })}
			height={300}

			class={'text-white'}

	>
	{#snippet marks()}
		<LinearGradient class={"from-emerald-500/50 to-emerald-500/1"} vertical>
			{#snippet children({ gradient })}
				<Area line={{ class: 'stroke-emerald-500' }} fill={gradient} />
			{/snippet}
		</LinearGradient>
	{/snippet}
	</AreaChart>
	</div>
	{/if}
		<!--Read Kb/s-->
	{#if isLoading}
		<div class='w-4xl h-100 aspect-auto bg-zinc-500 p-5 rounded-lg items-center flex gap-4 flex-col text-white animate-pulse'></div>
	{:else}
	<div class='w-4xl aspect-auto card-hover-animate border border-[hsl(0,0%,35%)] p-5 rounded-lg items-center flex gap-4 flex-col text-[hsl(0,0%,95%)]'>
		<span class="text-xl text-[hsl(0,0%,95%)]">Disk Read Speed (Kb/s)</span>
		<AreaChart
			data={readDataGraph}
			x="time"
			y="value"
			props={{ area: { curve: curveCatmullRom } }}
			padding={defaultChartPadding({ left: 30 })}
			height={300}

			class={'text-white'}

	>
	{#snippet marks()}
		<LinearGradient class={"from-emerald-500/50 to-emerald-500/1"} vertical>
			{#snippet children({ gradient })}
				<Area line={{ class: 'stroke-emerald-500' }} fill={gradient} />
			{/snippet}
		</LinearGradient>
	{/snippet}
	</AreaChart>
	</div>
	{/if}
</div>
</main>
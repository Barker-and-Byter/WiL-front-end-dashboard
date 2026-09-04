<script lang="ts">
import { page } from '$app/stores';
import { onMount, onDestroy, untrack} from 'svelte';
import { serverManager } from '$lib/components/serverStore.svelte';
import { PUBLIC_EVENT_SOURCE_ONE, PUBLIC_EVENT_SOURCE_TWO } from '$env/static/public';
import { Area, Arc, Chart, ClipPath, Group, Layer, Line, LinearGradient, Text, PieChart } from 'layerchart';
import { scaleLinear, scaleThreshold } from 'd3-scale';
import { SpringValue } from 'svelte-ux';
import { curveCatmullRom } from 'd3-shape';
import { AreaChart, defaultChartPadding } from 'layerchart';
import { cls } from '@layerstack/tailwind';

interface ContainerStats {
    name: string;
    dock_cpu_perc: number;
    dock_ram_perc: number;
    dock_net_io: string;
    dock_block_io: string;
	}

interface GraphPoint {
    time: Date;
    value: number;
}

let containername = $derived($page.params.containerName ?? "");
let containerstats = $state<ContainerStats | undefined >(undefined);
let eventsource: EventSource;	
let cpuUsage: number = $state(0);
let ramUsage: number = $state(0);
let isLoading: boolean = $state(true);
let blockio = "";
let netio = "";
let blockWrite = 0;
let blockRead = 0;
let netWrite = 0;
let netRead = 0;


let CPUDataGraph = $state(
    Array.from({ length: 60}, (_, i) => ({ time : i, value: 0}))
);

let RAMDataGraph = $state(
    Array.from({ length: 60}, (_, i) => ({ time : i, value: 0}))
);

let netWriteGraph = $state<GraphPoint[]>([]);
let netReadGraph = $state<GraphPoint[]>([]);
let blockWriteGraph = $state<GraphPoint[]>([]);
let blockReadGraph = $state<GraphPoint[]>([]);


//resets all graphs and values used
function reset(){
    CPUDataGraph = Array.from({ length: 60}, (_, i) => ({ time : i, value: 0}));
    RAMDataGraph = Array.from({ length: 60}, (_, i) => ({ time : i, value: 0}));
    blockReadGraph = [];
    blockWriteGraph = [];
    netWriteGraph = [];
    netReadGraph = [];
    isLoading = true;
}



function startReceiving(eventsource: EventSource) {
    eventsource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        serverManager.containers = data.containers;
        containerstats = serverManager.get_container_stats(containername);
        cpuUsage = containerstats?.dock_cpu_perc ?? 0;
        ramUsage = containerstats?.dock_ram_perc ?? 0;
                    CPUDataGraph = [
            ...CPUDataGraph.slice(1).map(point => ({ ...point, time: point.time - 1 })),
            { time: 60, value: cpuUsage ?? 0}
            ];
        RAMDataGraph = [
            ...RAMDataGraph.slice(1).map(point => ({ ...point, time: point.time - 1 })),
            { time: 60, value: ramUsage ?? 0 }
            ];
        blockio = containerstats?.dock_block_io ?? "";
        [blockRead, blockWrite] = serverManager.get_Parsed_IO(blockio);
        netio = containerstats?.dock_net_io ?? "";
        [netRead, netWrite] = serverManager.get_Parsed_IO(netio);
        const now = new Date();

        netWriteGraph.push({ time: now, value: netWrite });
        if (netWriteGraph.length > 60) netWriteGraph.shift();

        netReadGraph.push({ time: now, value: netRead });
        if (netReadGraph.length > 60) netReadGraph.shift();

        blockWriteGraph.push({ time: now, value: blockWrite });
        if (blockWriteGraph.length > 60) blockWriteGraph.shift();

        blockReadGraph.push({ time: now, value: blockRead });
        if (blockReadGraph.length > 60) blockReadGraph.shift();

        if (isLoading){
            isLoading = false;
        }
    }
    eventsource.onerror = (err) => {
        console.error("Eventsource failed:", err);
    }
}

let NetSeries = $derived([
    {
        key: 'Net Rx',
        color: '#3b82f6',
        data: netReadGraph
    },
    {
        key: 'Net Tx',
        color: '#FFA500',
        data: netWriteGraph
    }
]);

let BlockSeries = $derived([
    {
        key: 'Block Write',
        color: '#FFA500',
        data: blockWriteGraph
    },
    {
        key: 'Block Read',
        color: '#3b82f6',
        data: blockReadGraph
    }
]);



$effect(() =>{
    if (!containername) return;

    reset();

    if (eventsource) {
        eventsource.close();
    }

    if (serverManager.server1name === serverManager.currentServer){
       eventsource = new EventSource("/api/stream");
    } else if (serverManager.server2name === serverManager.currentServer){
        eventsource = new EventSource(PUBLIC_EVENT_SOURCE_TWO + "/data-stream");
    }

    startReceiving(eventsource);


    return (() => {
        if (eventsource){
            eventsource.close();
        }
    });
});


</script>
<div>
<h1 class="text-8xl pt-10 font-black bg-clip-text uppercase text-transparent -drop-shadow-[0_4px_6px_rgba(0,0,0,0.4)]
              [-webkit-text-stroke:1px_rgba(255,255,255,0.4)] text-center">{containername}</h1>
<div class="pt-10 justify-center flex flex-wrap gap-8 overflow-scroll">

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
		<LinearGradient class={(cpuUsage ?? 0) < 80 ? "from-blue-500/50 to-blue-500/1" : "from-red-500/50 to-red-500/1"} vertical>
			{#snippet children({ gradient })}
				<Area line={(cpuUsage ?? 0) < 80 ? { class: 'stroke-blue-500' } : { class: 'stroke-red-500' }} fill={gradient} />
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
		<LinearGradient class={(ramUsage ?? 0) < 80 ? "from-blue-500/50 to-blue-500/1" : "from-red-500/50 to-red-500/1"} vertical>
			{#snippet children({ gradient })}
				<Area line={(ramUsage ?? 0) < 80 ? { class: 'stroke-blue-500' } : { class: 'stroke-red-500' }} fill={gradient} />
			{/snippet}
		</LinearGradient>
	{/snippet}
	</AreaChart>
	</div>
	{/if}
<!--Block io graph-->
{#if isLoading}
<div class='w-4xl h-100 aspect-auto bg-zinc-500 p-5 rounded-lg items-center flex gap-4 flex-col text-white animate-pulse'></div>
{:else}
<div class='w-4xl aspect-auto backdrop-blur-md card-hover-animate border border-[hsl(0,0%,30%)] p-5 rounded-lg items-center flex gap-4 flex-col text-white/70'>
<h1 class="text-xl text-[hsl(0,0%,95%)]">Block I/O (bytes)</h1>
  <AreaChart
    y="value"
    x="time"
    series={BlockSeries}
    annotations={BlockSeries.flatMap((s) => {
		const lastDataPoint = s.data?.[s.data.length - 1] ?? null;
    if (!lastDataPoint) return [];
		return {
			type: 'point',
			seriesKey: s.key,
			label: s.key === 'Block Write' ? 'Write' : 'Read',
			labelPlacement: 'right',
			labelXOffset: 4,
			x: lastDataPoint.time,
			y: lastDataPoint.value,
			props: {
				circle: { fill: s.color },
				label: { fill: s.color }
			}
		};
	})}
    padding={defaultChartPadding({ right: 10 })}
    height={300}
    props = {{
      xAxis: { tickSpacing: 150}
      
    }}
  >
  	{#snippet marks({ context })}
		{#each context.series.series as s, i (s.key)}
			<!-- Can also use basic 'transparent' for second stop for better browser compatibility -->
			<LinearGradient
				stops={s.color
					? [s.color, 'color-mix(in lch, ' + s.color + ' 10%, transparent)']
					: undefined}
				vertical
			>
				{#snippet children({ gradient })}
					<Area seriesKey={s.key} line={{ stroke: s.color }} fill={gradient} fillOpacity={0.3} />
				{/snippet}
			</LinearGradient>
		{/each}
	{/snippet}
  </AreaChart> 
</div>
{/if}
<!--Network I/O graph-->
{#if isLoading}
<div class='w-4xl h-100 aspect-auto bg-zinc-500 p-5 rounded-lg items-center flex gap-4 flex-col text-white animate-pulse'></div>
{:else}
<div class='w-4xl aspect-auto backdrop-blur-md card-hover-animate border border-[hsl(0,0%,30%)] p-5 rounded-lg items-center flex gap-4 flex-col text-white/70'>
<h1 class="text-xl text-[hsl(0,0%,95%)]">Network I/O (bytes)</h1>
  <AreaChart
    y="value"
    x="time"
    series={NetSeries}
    annotations={NetSeries.flatMap((s) => {
		const lastDataPoint = s.data?.[s.data.length - 1] ?? null;
    if (!lastDataPoint) return [];
		return {
			type: 'point',
			seriesKey: s.key,
			label: s.key === 'Net Tx' ? 'Net Tx' : 'Net Rx',
			labelPlacement: 'right',
			labelXOffset: 4,
			x: lastDataPoint.time,
			y: lastDataPoint.value,
			props: {
				circle: { fill: s.color },
				label: { fill: s.color }
			}
		};
	})}
    padding={defaultChartPadding({ right: 10 })}
    height={300}
    props = {{
      xAxis: { tickSpacing: 150}
      
    }}
  >
  	{#snippet marks({ context })}
		{#each context.series.series as s, i (s.key)}
			<!-- Can also use basic 'transparent' for second stop for better browser compatibility -->
			<LinearGradient
				stops={s.color
					? [s.color, 'color-mix(in lch, ' + s.color + ' 10%, transparent)']
					: undefined}
				vertical
			>
				{#snippet children({ gradient })}
					<Area seriesKey={s.key} line={{ stroke: s.color }} fill={gradient} fillOpacity={0.3} />
				{/snippet}
			</LinearGradient>
		{/each}
	{/snippet}
  </AreaChart> 
</div>
{/if}

</div>
</div>
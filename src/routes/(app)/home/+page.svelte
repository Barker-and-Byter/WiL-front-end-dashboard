
<script lang="ts">

import { BarChart, Text,Spline,Chart, Axis, Area, AreaChart, defaultChartPadding, LinearGradient, pivotLonger, Layer } from 'layerchart';
import { group } from 'd3-array';
import { onMount, untrack } from "svelte";
import { PUBLIC_EVENT_SOURCE_ONE, PUBLIC_EVENT_SOURCE_TWO } from '$env/static/public';
import { page } from '$app/state';
import { serverManager } from '$lib/components/serverStore.svelte';
import dockerlogowhite from '$lib/assets/docker-logo-white.svg?raw';
const dockerlogowhiteencoded = 	`data:image/svg+xml,${encodeURIComponent(dockerlogowhite)}`;


type DataPoint = {
  time?: Date;
  s1CpuValue?: number;
  s1RamValue?: number;
  s1DriveUsage?: number;
  s1DriveUsed?: number;
  s1DriveFree?: number;
  s1RamUsed?: number;
  s1RamFree?: number;
  s1upSpeed?: number;
  s1downSpeed?: number;
  s1writeSpeed?: number;
  s1readSpeed?: number;
  s1timestamp?: number;
  s1latency? : number;
  s2CpuValue?: number;
  s2RamValue?: number;
  s2DriveUsage?: number;
  s2DriveUsed?: number;
  s2DriveFree?: number;
  s2RamUsed?: number;
  s2RamFree?: number;
  s2upSpeed?: string;
  s2downSpeed?: string;
  s2writeSpeed?: number;
  s2readSpeed?: number;
  s2timestamp?: number;
  s2latency? : number;

};

// set series for data
let chartData = $state<DataPoint[]>([]);



//Load in servers as event sources
let isLoading: boolean = $state(true);
let serverCache1: DataPoint = {};
let serverCache2: DataPoint = {};
let time = Date.now();
let server1name = $state("");
let server2name = $state("")
let containers: Array<string> = [];
let source: EventSource | null = null;

const keys = ['s1CpuValue',
's2CpuValue',
's1RamValue',
's2RamValue',
's1DriveUsage',
's2DriveUsage',
's1DriveUsed',
's2DriveUsed',
's1DriveFree',
's2DriveFree',
's1upSpeed',
's1downSpeed'];

//flatten data and group by server 
let flatData = $derived(
  chartData.length > 0 ? pivotLonger(chartData, keys, 'server', 'value') : []
);
let dataByServer = $derived(
  flatData.length > 0 ? group(flatData, (d) => d.server) : new Map()
);
//store series for annotations
let Cpuseries = $derived([
      { 
        key: 's1CpuValue',
        data: dataByServer.get('s1CpuValue') || [],
        color: 'hsl(222 32 55)' },  //colour yellow
      {
        key: 's2CpuValue',
        data: dataByServer.get('s2CpuValue') || [],
        color: 'hsl(132 32 55)'}, //colour green
	]);


let Ramseries = $derived([
      { 
        key: 's1RamValue',
        data: dataByServer.get('s1RamValue') || [],
        color: 'hsl(222 32 55)' },  //colour yellow
      {
        key: 's2RamValue',
        data: dataByServer.get('s2RamValue') || [],
        color: 'hsl(132 32 55)'}, //colour green
	]);

//Function for aggregating the disk data to be later used within the data series. 
let diskData = $derived(() =>{
  if (chartData.length === 0) return {used: [], free: []};

  let UsedPoints : {server : String; value : number }[] = [];
  let freePoints : {server : String; value : number }[] = [];

  let latest = chartData[chartData.length - 1];
  if(latest.s1DriveUsed != undefined) {
  UsedPoints.push({ server : "Server 1", value : latest.s1DriveUsed });
  } if (latest.s1DriveFree != undefined){
    freePoints.push({ server : "Server 1", value : latest.s1DriveFree });
  } if (latest.s2DriveUsed != undefined){
    UsedPoints.push({ server : "Server 2", value : latest.s2DriveUsed });
  } if (latest.s2DriveFree != undefined){
    freePoints.push({ server : "Server 2", value : latest.s2DriveFree });
  }
  return {used: UsedPoints, free: freePoints}
})

  //store serries for disk
let Diskseries = $derived([
      { 
        key: 'used',
        label: 'Used Space',
        data: diskData().used || [],
        color: 'hsl(9 87 57)' },  //colour red
      {
        key: 'free',
        label: 'Free Space',
        data: diskData().free || [],
        color: 'hsl(132 32 55)'}, //colour green
	]);
  
let netData = $derived(() =>{
  if (chartData.length == 0) return {server1 : [], server2 : []};


  let server1Points : { time: Date; value: number }[] = [];
  let server2Points : { time: Date; value: number }[] = [];

  for (const item of chartData){
  if (item.s1upSpeed != undefined && item.s1downSpeed != undefined){
    server1Points.push({ time: item.time ?? new Date(), value: (Number(item.s1upSpeed) + Number(item.s1downSpeed))})
  }
  if (item.s2upSpeed != undefined && item.s2downSpeed != undefined){
    server2Points.push({ time: item.time ?? new Date(), value: (Number(item.s2upSpeed) + Number(item.s2downSpeed))})  
  } 
  }
  return {server1 : server1Points, server2: server2Points}
});




// Store series for combined Net utilisation information (per server)
let Netseries = $derived([
  {
    key: 'Server1',
    label: 'Server1',
    data: netData().server1 || [],
    color: 'hsl(222 32 55)'
  },
  {
    key: 'Server2',
    label: 'Server2',
    data: netData().server2 || [],
    color: 'hsl(132 32 55)'
  }
]);

//ensures that data is synchronised before being displayed
function combineData(){
if (Object.keys(serverCache1).length > 0 && Object.keys(serverCache2).length > 0){
  if (chartData.length > 0)  isLoading = false;
 const mergedPoint: DataPoint = {
  time: new Date(),
  ...serverCache1,
  ...serverCache2
 }
 chartData = [...chartData, mergedPoint].slice(-60);

} else {
  return;
}
}


async function init() {
  const res = await fetch("/api/auth", {method: "POST"});
  if (!res.ok){
    status = "error";
    return
  }

  connectStream();
}

function connectStream() {
  source = new EventSource("/api/stream");

    source.onmessage = (event) =>{
      const data = JSON.parse(event.data);
      const localTime = Date.now();
      const latency = data.timestamp - localTime;
      if (serverManager.server1name == ""){
        serverManager.server1name = data.hostname;
      }

        serverCache1 = {
        s1CpuValue : Number(data.cpuUsage ?? 0),
        s1RamValue: Number(data.ramUsage ?? 0),
        s1DriveUsage: Number(data.driveUsage ?? 0),
        s1DriveUsed: Number(data.driveUsed ?? 0),
        s1DriveFree: Number(data.driveFree ?? 0),
        s1RamUsed: Number(data.ramUsed ?? 0),
        s1RamFree: Number(data.ramFree ?? 0),
        s1upSpeed: Number(data.upSpeed ?? 0),
        s1downSpeed: Number(data.downSpeed ?? 0),
        s1writeSpeed: Number(data.writeSpeed ?? 0),
        s1readSpeed: Number(data.readSpeed ?? 0),
        s1latency: latency,
      };
      combineData();

  };
  source.onerror = (err) => {
    source.close();
    return
  }

}


onMount(() => {
  serverManager.containers = [];
  serverManager.currentServer = null;
  isLoading = true;

  init();

  let serverSource2: EventSource = new EventSource(PUBLIC_EVENT_SOURCE_TWO + '/data-stream');
  

  serverSource2.onmessage = (event) => {
        const data = JSON.parse(event.data);

      const localTime = Date.now();
      const latency = data.timestamp - localTime;
      if (serverManager.server2name == ""){
        serverManager.server2name = data.hostname;
      } 

      serverCache2 = {
        s2CpuValue : Number(data.cpuUsage ?? 0),
        s2RamValue: Number(data.ramUsage ?? 0),
        s2DriveUsage: Number(data.driveUsage ?? 0),
        s2DriveUsed: Number(data.driveUsed ?? 0),
        s2DriveFree: Number(data.driveFree ?? 0),
        s2RamUsed: Number(data.ramUsed ?? 0),
        s2RamFree: Number(data.ramFree ?? 0),
        s2upSpeed: String(data.upSpeed ?? "0"),
        s2downSpeed: String(data.downSpeed ?? "0"),
        s2writeSpeed: Number(data.writeSpeed ?? 0),
        s2readSpeed: Number(data.readSpeed ?? 0),
        s2latency: latency,
      };
      combineData();
  }

  return () => {
    source.close();
    serverSource2.close();
  }
})

</script>







<main class="min-h-screen">



<h1 class="text-white size-xl justify-center text-center pb-10">Multi-Server Dashboard</h1>
<div class="flex flex-wrap gap-12 justify-center overflow-scroll pb-10">
{#if isLoading}
<div class='w-4xl h-100 aspect-auto bg-zinc-500 p-5 rounded-lg items-center flex gap-4 flex-col text-white animate-pulse'></div>
{:else}
<div class='w-4xl aspect-auto backdrop-blur-md card-hover-animate border border-[hsl(0,0%,30%)] p-5 rounded-lg gap-4 items-center flex flex-col text-white'>
<h1 class="text-xl text-[hsl(0,0%,95%)]">CPU %</h1>
  <AreaChart
    y="value"
    x="time"
    series={Cpuseries}
    annotations={Cpuseries.flatMap((s) => {
		const lastDataPoint = s.data?.[s.data.length - 1] ?? null;
    if (!lastDataPoint) return [];
		return {
			type: 'point',
			seriesKey: s.key,
			label: s.key === 's1CpuValue' ? 'Server 1' : 'Server 2',
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
    yDomain={[0, 100]}
    padding={defaultChartPadding({ right: 10})}
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
<!--Net Graph tx+rx-->
{#if isLoading}
<div class='w-4xl aspect-auto bg-zinc-500 p-5 rounded-lg items-center flex gap-4 flex-col text-white animate-pulse'></div>
{:else}
<div class='w-4xl h-100 aspect-auto backdrop-blur-md card-hover-animate border border-[hsl(0,0%,30%)] p-5 rounded-lg items-center flex gap-4 flex-col text-white/70'>
<h1 class="text-xl text-[hsl(0,0%,95%)]">RAM %</h1>
  <AreaChart
    y="value"
    x="time"
    series={Ramseries}
    annotations={Ramseries.flatMap((s) => {
		const lastDataPoint = s.data?.[s.data.length - 1] ?? null;
    if (!lastDataPoint) return [];
		return {
			type: 'point',
			seriesKey: s.key,
			label: s.key === 's1RamValue' ? 'Server 1' : 'Server 2',
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
    yDomain={[0, 100]}
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
<!--Combined Net Usage Mb/s -->
{#if isLoading}
<div class='w-4xl h-100 aspect-auto bg-zinc-500 p-5 rounded-lg items-center flex gap-4 flex-col text-white animate-pulse'></div>
{:else}
<div class='w-4xl h-100 aspect-auto backdrop-blur-md card-hover-animate border border-[hsl(0,0%,30%)] p-5 rounded-lg items-center flex gap-4 flex-col text-white/70'>
<h1 class="text-xl text-[hsl(0,0%,95%)]">Net Usage tx+rx (KB/s)</h1>
  <AreaChart
    y="value"
    x="time"
    series={Netseries}
    annotations={Netseries.flatMap((s) => {
		const lastDataPoint = s.data?.[s.data.length - 1] ?? null;
    if (!lastDataPoint) return [];
		return {
			type: 'point',
			seriesKey: s.key,
			label: s.key === 'Server1' ? 'Server 1' : 'Server 2',
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
<!--Combined Disk Usage Kb/s (fix this jared my fella) -->
{#if isLoading}
<div class='w-4xl aspect-auto bg-zinc-500 p-5 rounded-lg items-center flex gap-4 flex-col text-white animate-pulse'></div>
{:else}
<div class='w-4xl h-100 aspect-auto backdrop-blur-md card-hover-animate border border-[hsl(0,0%,30%)] p-5 rounded-lg items-center flex gap-4 flex-col text-white/70'>
<h1 class="text-xl text-[hsl(0,0%,95%)]">Disk Usage Combined (KB/s)</h1>
  <AreaChart
    y="value"
    x="time"
    series={Netseries}
    annotations={Netseries.flatMap((s) => {
		const lastDataPoint = s.data?.[s.data.length - 1] ?? null;
    if (!lastDataPoint) return [];
		return {
			type: 'point',
			seriesKey: s.key,
			label: s.key === 'Server1' ? 'Server 1' : 'Server 2',
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
<!--Disk Usage Per Node GB-->
{#if isLoading}
<div class='w-4xl h-100 aspect-auto bg-zinc-500 p-5 rounded-lg items-center flex gap-4 flex-col text-white animate-pulse'></div>
{:else}
<div class='w-4xl aspect-auto blackdrop-blur-md card-hover-animate border border-[hsl(0,0%,30%)]   p-5 rounded-lg items-center flex gap-4 flex-col text-white'>
<h1 class="text-xl text-[hsl(0,0%,95%)]">Disk Usage per node (GB) </h1>
<BarChart
	x="server"
  y="value"
	series={Diskseries}
	seriesLayout="stack"
	props={{
		xAxis: { format: 'none' },
		yAxis: { format: 'metric' },
		tooltip: {
			header: { format: 'none' }
		}
	}}
	height={300}
/>
</div>
{/if}
</div>
</main>
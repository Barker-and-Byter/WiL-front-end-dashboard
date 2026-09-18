
<script lang="ts">

import { BarChart, Text,Spline,Chart, Axis, Area, AreaChart, defaultChartPadding, LinearGradient, pivotLonger, Layer } from 'layerchart';
import { group } from 'd3-array';
import { onMount, untrack } from "svelte";
import { env } from '$env/dynamic/public';
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




type ServerData = { [key: string]: number | string | Date};
type ServerConfig = { id: string; name: string };


//Load in servers as event sources
let chartData = $state<DataPoint[]>([]);
let isLoading: boolean = $state(true);
let serverCaches = $state<Record<string, ServerData>>({});
let activeConnections: EventSource[] = [];
let time = Date.now();
let source: EventSource | null = null;

let configuredServers =  $derived.by<ServerConfig[]>(() => {
  const servers: ServerConfig[] = [];

  for (const key in env) {
    if (key.startsWith('PUBLIC_EVENT_SOURCE_')){
      const suffix = key.replace('PUBLIC_EVENT_SOURCE_', '');
    servers.push({
      id: suffix.toLowerCase(),
      name: ""
    });
  }
  }
  return servers;
});

let dynaKeys = $derived(
  configuredServers.flatMap(server => [
    `${server.id}CpuValue`, `${server.id}RamValue`, `${server.id}DriveUsage`,
    `${server.id}DriveUsed`, `${server.id}DriveFree`, `${server.id}upSpeed`, `${server.id}downSpeed`
  ])
);

  let flatData = $derived(
    chartData.length > 0 ? pivotLonger(chartData, dynaKeys, 'metricType', 'value') : []
  );
  
  let dataByMetric = $derived(
    flatData.length > 0 ? group(flatData, (d) => d.metricType) : new Map()
  );


  let Cpuseries = $derived(
    configuredServers.map((server, index) => ({
      key: `${server.id}CpuValue`,
      label: server.name,
      data: dataByMetric.get(`${server.id}CpuValue`) || [],
      color: index % 2 === 0 ? 'hsl(222 32 55)' : 'hsl(132 32 55)' 
    }))
  )


  let Ramseries = $derived(
    configuredServers.map((server, index) => ({
      key: `${server.id}RamValue`,
      label: server.name,
      data: dataByMetric.get(`${server.id}RamValue`) || [],
      color: index % 2 === 0 ? 'hsl(222 32 55)' : 'hsl(132 32 55)' 
    }))
  )

//Function for aggregating the disk data to be later used within the data series. 
let diskData = $derived(() =>{
  if (chartData.length === 0) return {used: [], free: []};

  let UsedPoints : {server : String; value : number }[] = [];
  let freePoints : {server : String; value : number }[] = [];

  let latest = chartData[chartData.length - 1];

  configuredServers.forEach(svr => {
    const usedKey = `${svr.id}DriveUsed`;
    const freeKey = `${svr.id}DriveFree`;

    if (latest[usedKey] !== undefined) {
      usedPoints.push({ server: svr.name, value: latest[usedKey]});
    }
    if (latest[usedKey] !== undefined){
      freePoints.push({ server: svr.name, value: latest[freeKey]});
    }
  })


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
  if (chartData.length == 0) return {};

  const netMap: Record<string, { time: Date; value: number }[]> = {};
  configuredServers.forEach(svr => {
    netMap[svr.id] = [];
    });
    for (const item of chartData) {
      configuredServers.forEach(svr => {
        const upKey = `${svr.id}upSpeed`;
        const downKey = `${svr.id}downSpeed`;
        if (item[upKey] !== undefined && item[downKey] !== undefined) {
          netMap[svr.id].push({
            time: item.time!,
            value: (item[upKey] as number) + (item[downKey] as number)
          });
        }
      });
    }

    return netMap;
  
});

let Netseries = $derived(
  configuredServers.map((srv, index) => ({
    key: srv.id,
    label: srv.name,
    data: netData()[srv.id] || [],
    color: index % 2 === 0 ? 'hsl(222 32 55)' : 'hsl(132 32 55)'
  }))
);


//ensures that data is synchronised before being displayed
function combineData(){
  const allServersReady = configuredServers.every(srv => serverCaches[srv.id] !== undefined);

  if (allServersReady) {
    if(chartData.length > 0) isLoading = false;

    const mergedPoint: DataPoint = {
      time: new Date(),
    };

    configuredServers.forEach(server => {
      Object.entries(serverCaches[server.id]).forEach(([metricKey, val]) => {
        mergedPoint[`${server.id}${metricKey}`] = val;
      });
    });
    chartData = [...chartData, mergedPoint].slice(-60);
  }
}

async function initServer(serverId: string) {
  const res = await fetch("/api/auth", {
    method: "POST",
    headers: { 'Content-type' : 'application/json' },
    body: JSON.stringify({ serverId })
  });

  if (!res.ok) return;
  connectStream(serverId);
}

function connectStream(serverId: string){
  const source = new EventSource(`/api/stream?serverId=${serverId}`);
  activeConnections.push(source);

      source.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const latency = data.timestamp - Date.now();
      if (data.hostname) {
        const targetServer = configuredServers.find(srv => srv.id === serverId);
        if (targetServer && targetServer.name !== data.hostname) {
            targetServer.name = data.hostname;
        }
        
        // Dynamic push to your global state store
        serverManager.set_server_name(serverId, data.hostname);
    }
      serverCaches[serverId] = {
        CpuValue: Number(data.cpuUsage ?? 0),
        RamValue: Number(data.ramUsage ?? 0),
        DriveUsage: Number(data.driveUsage ?? 0),
        DriveUsed: Number(data.driveUsed ?? 0),
        DriveFree: Number(data.driveFree ?? 0),
        upSpeed: Number(data.upSpeed ?? 0),
        downSpeed: Number(data.downSpeed ?? 0),
        latency: latency,
      };

      combineData();
    };
    source.onerror = () => {
      source.close();
    };
}


onMount(() => {
  serverManager.containers = [];
  serverManager.currentServer = null;
  isLoading = true;

  configuredServers.forEach(server => {
    initServer(server.id)
  });

  return () => {
    activeConnections.forEach(conn => conn.close())
  }
});

</script>







<main class="min-h-screen">



<h1 class="text-white size-xl justify-center text-center pb-10">Multi-Server Dashboard</h1>
<div class="flex flex-wrap gap-12 justify-center overflow-scroll pb-10">
{#if isLoading}
<div class='w-4xl h-100 aspect-auto bg-zinc-500 p-5 rounded-3xl items-center flex gap-4 flex-col text-white animate-pulse'></div>
{:else}
<div class='w-4xl aspect-auto backdrop-blur-md card-hover-animate border border-[hsl(0,0%,30%)] p-5 rounded-3xl gap-4 items-center flex flex-col text-white'>
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
<div class='w-4xl aspect-auto bg-zinc-500 p-5 rounded-3xl items-center flex gap-4 flex-col text-white animate-pulse'></div>
{:else}
<div class='w-4xl h-100 aspect-auto backdrop-blur-md card-hover-animate border border-[hsl(0,0%,30%)] p-5 rounded-3xl items-center flex gap-4 flex-col text-white/70'>
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
<div class='w-4xl h-100 aspect-auto bg-zinc-500 p-5 rounded-3xl items-center flex gap-4 flex-col text-white animate-pulse'></div>
{:else}
<div class='w-4xl h-100 aspect-auto backdrop-blur-md card-hover-animate border border-[hsl(0,0%,30%)] p-5 rounded-3xl items-center flex gap-4 flex-col text-white/70'>
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
<div class='w-4xl aspect-auto bg-zinc-500 p-5 rounded-3xl items-center flex gap-4 flex-col text-white animate-pulse'></div>
{:else}
<div class='w-4xl h-100 aspect-auto backdrop-blur-md card-hover-animate border border-[hsl(0,0%,30%)] p-5 rounded-3xl items-center flex gap-4 flex-col text-white/70'>
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
<div class='w-4xl h-100 aspect-auto bg-zinc-500 p-5 rounded-3xl items-center flex gap-4 flex-col text-white animate-pulse'></div>
{:else}
<div class='w-4xl aspect-auto blackdrop-blur-md card-hover-animate border border-[hsl(0,0%,30%)]   p-5 rounded-3xl items-center flex gap-4 flex-col text-white'>
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
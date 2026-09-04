<script lang="ts">
    import { Area, Arc, Chart, ClipPath, Group, Layer, Line, LinearGradient, Text, PieChart } from 'layerchart';
	import { scaleLinear, scaleThreshold } from 'd3-scale';
	import { SpringValue } from 'svelte-ux';
	import { curveCatmullRom } from 'd3-shape';
	import { AreaChart, defaultChartPadding } from 'layerchart';
	import { cls } from '@layerstack/tailwind';
    import { onDestroy, onMount, untrack } from 'svelte';
	import { serverManager } from '$lib/components/serverStore.svelte';
    import { PUBLIC_EVENT_SOURCE_ONE, PUBLIC_EVENT_SOURCE_TWO } from '$env/static/public';

    let eventsource: EventSource;
    let isLoading: boolean = $state(true);

    interface metrics {
        time: Date;
        cpu: number; 
        ram: number; 
        blockin: number; 
        blockout: number; 
        netIn: number; 
        netout: number

    }

    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

    interface ContainerData {
        name: string;
        data: metrics[];
    }
    let containerGraph = $state<ContainerData[]>([]);


    function startReceiving(eventsource: EventSource) {

        eventsource.onmessage = (event) => {

            const data = JSON.parse(event.data);
            serverManager.containers = data.containers;

            const receivedTime = new Date();

            let updatedGraph = [...containerGraph];

            const receivedNames = new Set<string>();

            for (const containerName in serverManager.containers) {
                const containerData = serverManager.containers[containerName];

                const actualName = containerData.name || containerName;

                receivedNames.add(actualName);

                let existingContainer = containerGraph.find(c => c.name === actualName);

                let [blockread, blockwrite] = serverManager.get_Parsed_IO(containerData.dock_block_io);
                let [netread, netwrite] = serverManager.get_Parsed_IO(containerData.dock_net_io);

                const newPoint: metrics = {
                    time: receivedTime,
                    cpu: containerData.dock_cpu_perc,
                    ram: containerData.dock_ram_perc,
                    blockin: blockread,
                    blockout: blockwrite,
                    netIn: netread,
                    netout: netwrite
                }

                if (existingContainer){
                    existingContainer.data = [...existingContainer.data, newPoint].slice(-60);
                } else {
                    containerGraph.push({
                        name: actualName,
                        data: [newPoint],
                    });
                }
            }

            containerGraph = containerGraph.filter(c => receivedNames.has(c.name));

            if (isLoading && containerGraph.length > 0){
                isLoading = false;
            }
        }
        eventsource.onerror = (err) => {
            console.error("Eventsource failed:", err);
        }
    }

    let cpuSeries = $derived(
        containerGraph.map((container, index) => ({
            key: container.name,
            color: colors[index % colors.length],
            data: container.data.map(d => ({ time: d.time, value: d.cpu}))
        }))
    );

    let ramSeries = $derived(
        containerGraph.map((container, index) => ({
            key: container.name,
            color: colors[index % colors.length],
            data: container.data.map(d => ({ time: d.time, value: d.ram }))
        }))
    );

    let blockInSeries = $derived(
        containerGraph.map((container, index) => ({
            key: container.name,
            color: colors[index % colors.length],
            data: container.data.map(d => ({ time: d.time, value: d.blockin }))
        }))
    );

    let blockOutSeries = $derived(
        containerGraph.map((container, index) => ({
            key: container.name,
            color: colors[index % colors.length],
            data: container.data.map(d => ({ time: d.time, value: d.blockout }))
        }))
    );

    let netInSeries = $derived(
        containerGraph.map((container, index) => ({
            key: container.name,
            color: colors[index % colors.length],
            data: container.data.map(d => ({ time: d.time, value: d.netIn }))
        }))
    );

    let netOutSeries = $derived(
        containerGraph.map((container, index) => ({
            key: container.name,
            color: colors[index % colors.length],
            data: container.data.map(d => ({ time: d.time, value: d.netout }))
        }))
    );
    


    onMount (() => {
    if (eventsource) {
        eventsource.close();
    }

    if (serverManager.server1name == serverManager.currentServer){
        eventsource = new EventSource("/api/stream");
    } else if (serverManager.server2name == serverManager.currentServer){
        eventsource = new EventSource(PUBLIC_EVENT_SOURCE_TWO + "/data-stream");
    }    

    startReceiving(eventsource);
    
    return (() => {
        if (eventsource){
            eventsource.close();
        }
    });

    }) 



</script>



<main>
<div class="flex justify-center flex-wrap pt-50 gap-8 overflow-scroll">
<!--CPU %-->
    {#if isLoading}
    <div class='w-4xl h-100 aspect-auto bg-zinc-500 p-8 rounded-lg items-center flex gap-4 flex-col text-white animate-pulse'></div>
    {:else}
    <div class='w-4xl aspect-auto backdrop-blur-md card-hover-animate border border-[hsl(0,0%,30%)] p-8 rounded-lg items-center flex gap-4 flex-col text-white/70'>
    <h1 class="text-xl text-[hsl(0,0%,95%)]">CPU %</h1>
    <AreaChart
        y="value"
        x="time"
        series={cpuSeries}
        annotations={cpuSeries.flatMap((s) => {
            const lastDataPoint = s.data?.[s.data.length - 1] ?? null;
        if (!lastDataPoint) return [];
            return {
                type: 'point',
                seriesKey: s.key,
                label: s.key,
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
        yDomain={[0, 100]}
        props = {{
        xAxis: { tickSpacing: 150}
        }}
    >
        {#snippet marks({ context })}
            <!-- Fixed: Using s.color directly since it's already computed in cpuSeries -->
            {#each context.series.series as s (s.key)}
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
    <!--Ram %-->
    {#if isLoading}
    <div class='w-4xl h-100 aspect-auto bg-zinc-500 p-8 rounded-lg items-center flex gap-4 flex-col text-white animate-pulse'></div>
    {:else}
    <div class='w-4xl aspect-auto backdrop-blur-md card-hover-animate border border-[hsl(0,0%,30%)] p-8 rounded-lg items-center flex gap-4 flex-col text-white/70'>
    <h1 class="text-xl text-[hsl(0,0%,95%)]">RAM %</h1>
    <AreaChart
        y="value"
        x="time"
        series={ramSeries}
        annotations={ramSeries.flatMap((s) => {
            const lastDataPoint = s.data?.[s.data.length - 1] ?? null;
        if (!lastDataPoint) return [];
            return {
                type: 'point',
                seriesKey: s.key,
                label: s.key,
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
        yDomain={[0, 100]}
        props = {{
        xAxis: { tickSpacing: 150}
        
        }}
    >
        {#snippet marks({ context })}
            <!-- Fixed: Using s.color directly since it's already computed in cpuSeries -->
            {#each context.series.series as s (s.key)}
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
    <!--Block In graph-->
    {#if isLoading}
    <div class='w-4xl h-100 aspect-auto bg-zinc-500 p-8 rounded-lg items-center flex gap-4 flex-col text-white animate-pulse'></div>
    {:else}
    <div class='w-4xl aspect-auto backdrop-blur-md card-hover-animate border border-[hsl(0,0%,30%)] p-8 rounded-lg items-center flex gap-4 flex-col text-white/70'>
    <h1 class="text-xl text-[hsl(0,0%,95%)]">Block Read (bytes)</h1>
    <AreaChart
        y="value"
        x="time"
        series={blockInSeries}
        annotations={blockInSeries.flatMap((s) => {
            const lastDataPoint = s.data?.[s.data.length - 1] ?? null;
        if (!lastDataPoint) return [];
            return {
                type: 'point',
                seriesKey: s.key,
                label: s.key,
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
            <!-- Fixed: Using s.color directly since it's already computed in cpuSeries -->
            {#each context.series.series as s (s.key)}
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
    <!--Block Out graph-->
    {#if isLoading}
    <div class='w-4xl h-100 aspect-auto bg-zinc-500 p-8 rounded-lg items-center flex gap-4 flex-col text-white animate-pulse'></div>
    {:else}
    <div class='w-4xl aspect-auto backdrop-blur-md card-hover-animate border border-[hsl(0,0%,30%)] p-8 rounded-lg items-center flex gap-4 flex-col text-white/70'>
    <h1 class="text-xl text-[hsl(0,0%,95%)]">Block Write (bytes)</h1>
    <AreaChart
        y="value"
        x="time"
        series={blockOutSeries}
        annotations={blockOutSeries.flatMap((s) => {
            const lastDataPoint = s.data?.[s.data.length - 1] ?? null;
        if (!lastDataPoint) return [];
            return {
                type: 'point',
                seriesKey: s.key,
                label: s.key,
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
            <!-- Fixed: Using s.color directly since it's already computed in cpuSeries -->
            {#each context.series.series as s (s.key)}
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
        <!--Net In graph-->
    {#if isLoading}
    <div class='w-4xl h-100 aspect-auto bg-zinc-500 p-8 rounded-lg items-center flex gap-4 flex-col text-white animate-pulse'></div>
    {:else}
    <div class='w-4xl aspect-auto backdrop-blur-md card-hover-animate border border-[hsl(0,0%,30%)] p-8 rounded-lg items-center flex gap-4 flex-col text-white/70'>
    <h1 class="text-xl text-[hsl(0,0%,95%)]">Net received (bytes)</h1>
    <AreaChart
        y="value"
        x="time"
        series={netInSeries}
        annotations={netInSeries.flatMap((s) => {
            const lastDataPoint = s.data?.[s.data.length - 1] ?? null;
        if (!lastDataPoint) return [];
            return {
                type: 'point',
                seriesKey: s.key,
                label: s.key,
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
            <!-- Fixed: Using s.color directly since it's already computed in cpuSeries -->
            {#each context.series.series as s (s.key)}
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
        <!--Net In graph-->
    {#if isLoading}
    <div class='w-4xl h-100 aspect-auto bg-zinc-500 p-8 rounded-lg items-center flex gap-4 flex-col text-white animate-pulse'></div>
    {:else}
    <div class='w-4xl aspect-auto backdrop-blur-md card-hover-animate border border-[hsl(0,0%,30%)] p-8 rounded-lg items-center flex gap-4 flex-col text-white/70'>
    <h1 class="text-xl text-[hsl(0,0%,95%)]">Net Transmitted (bytes)</h1>
    <AreaChart
        y="value"
        x="time"
        series={netOutSeries}
        annotations={netOutSeries.flatMap((s) => {
            const lastDataPoint = s.data?.[s.data.length - 1] ?? null;
        if (!lastDataPoint) return [];
            return {
                type: 'point',
                seriesKey: s.key,
                label: s.key,
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
            <!-- Fixed: Using s.color directly since it's already computed in cpuSeries -->
            {#each context.series.series as s (s.key)}
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
<padding>20</padding>
</main>

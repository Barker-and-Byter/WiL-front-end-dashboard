<script lang="ts">
import { page } from '$app/stores';
import { onMount, onDestroy} from 'svelte';
import { serverManager } from '$lib/components/serverStore.svelte';
    import { PUBLIC_EVENT_SOURCE_ONE, PUBLIC_EVENT_SOURCE_TWO } from '$env/static/public';

let containername = $derived($page.params.containerName);
let eventsource: EventSource;

onMount (() => {

    if (eventsource) {
        eventsource.close();
    }

    if (serverManager.server1name === serverManager.currentServer){
        eventsource = new EventSource(PUBLIC_EVENT_SOURCE_ONE + "/data-stream");
    } else if (serverManager.server2name === serverManager.currentServer){
        eventsource = new EventSource(PUBLIC_EVENT_SOURCE_TWO + "/data-stream");
    }
    
})

</script>


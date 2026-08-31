import { Server } from "@sveltejs/kit";
import { arraysEqual } from "layerchart/utils/array";

interface ContainerStats {
    name: string;
    dock_cpu_perc: number;
    dock_ram_perc: number;
    dock_net_io: string;
    dock_block_io: string;
	}

class ServerManager{
    server1name = $state('');
    server2name = $state('');
    currentServer = $state();
    containers = $state<ContainerStats[]>([]);

    set_current_server(server: string){
        if (this.server1name == server){
            this.currentServer = server;
        } else if (this.server2name == server){
            this.currentServer = server;
        }
    }
    get_container_stats(containerName: string){
        return this.containers.find(container => container.name === containerName);
    }
}

export const serverManager = new ServerManager;

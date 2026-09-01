import { read } from "$app/server";
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

    get_Parsed_IO (StatsIO: string){
        let number = ""; let unit = "";

        let blockWrite = (StatsIO.split("/")[0]).trim();
        let blockRead = (StatsIO.split("/")[1]).trim();

        [number, unit] =  blockWrite.split(/(?<=\d)(?=[a-zA-Z])/);
        let writenumber = parseFloat(number);
        let writeunit = unit;
        [number, unit] = blockRead.split(/(?<=\d)(?=[a-zA-Z])/);
        let readnumber = parseFloat(number);
        let readunit = unit;

        //convert to bytes based on the unit
        switch (writeunit){
            case "MB":
                writenumber = writenumber * (1024 ** 2);
                break;
            case "kB":
                writenumber = writenumber * (1024);
                break;
            default:
                break;
        }

        //same thing for reading 
        switch (readunit){
            case "MB":
                readnumber = readnumber * (1024 ** 2);
                break;
            case "kB":
                readnumber = readnumber * (1024);
                break;
            default:
                break;
        }

        return [readnumber, writenumber]

    }
}

export const serverManager = new ServerManager;

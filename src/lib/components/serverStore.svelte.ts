

interface ContainerStats {
    name: string;
    dock_cpu_perc: number;
    dock_ram_perc: number;
    dock_net_io: string;
    dock_block_io: string;
	}

class ServerManager{
    serverNames = $state<Record<string, string>>({});

    currentServer = $state();
    containers = $state<ContainerStats[]>([]);

    set_server_name(serverId: string, hostname: string) {
        this.serverNames[serverId.toLowerCase()] = hostname;
    }

    set_current_server(server: string){
        const serverExists = Object.values(this.serverNames).includes(server);

        if (serverExists) {
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

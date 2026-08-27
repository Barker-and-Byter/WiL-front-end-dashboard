import { writable } from "svelte/store";

export const currentServer = writable('Server 1');

export function serverChange(serverName: string){
    currentServer.set(serverName);
}
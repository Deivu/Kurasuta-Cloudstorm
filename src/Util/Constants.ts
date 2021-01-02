export const http = {
	version: 7,
	api: 'https://discordapp.com/api'
};

export const version = '1.1.4';

export enum IPCEvents {
	EVAL,
	MESSAGE,
	BROADCAST,
	READY,
	DISCONNECT,
	SHARDREADY,
	SHARDRESUME,
	MASTEREVAL,
	RESTARTALL,
	RESTART,
	FETCHUSER,
	FETCHCHANNEL,
	FETCHGUILD
}

export enum SharderEvents {
	DEBUG = 'debug',
	MESSAGE = 'message',
	READY = 'ready',
	DISCONNECT = 'clusterDisconnect',
	SPAWN = 'spawn',
	SHARD_READY = 'shardReady',
	SHARD_RECONNECT = 'shardReconnect',
	SHARD_RESUME = 'shardResume',
	ERROR = 'error'
}

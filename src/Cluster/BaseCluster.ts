import { Client, IClientOptions } from 'Cloudstorm';
import { ShardingManager } from '..';
import { ShardClientUtil } from '../Sharding/ShardClientUtil';
import { IPCEvents } from '../Util/Constants';
import * as Util from '../Util/Util';

interface KurasutaClient extends Client {
	shard?: ShardClientUtil
}

export abstract class BaseCluster {
	public readonly client: KurasutaClient;
	public readonly id: number;

	constructor(public manager: ShardingManager) {
		const env = process.env;
		const shards = env.CLUSTER_SHARDS!.split(',').map(Number);
		const clientConfig: IClientOptions = Util.mergeDefault<IClientOptions>(manager.clientOptions, {
			firstShardId: shards[0],
			lastShardId: shards[shards.length - 1],
			shardAmount: manager.shardCount
		});
		this.client = new manager.client(manager.token, clientConfig);
		const client = this.client as any;
		client.shard = new ShardClientUtil(client, manager.ipcSocket);
		this.id = Number(env.CLUSTER_ID);
	}

	public async init() {
		const shardUtil = this.client.shard!;
		await shardUtil.init();
		this.client.once('ready', () => shardUtil.send({ op: IPCEvents.READY, d: this.id }, { receptive: false }));
		this.client.on('shardReady', ({ id, ready }) => {
			if (ready) {
				shardUtil.send({ op: IPCEvents.SHARDREADY, d: { id: this.id, shardID: id } }, { receptive: false });
			} else {
				shardUtil.send({ op: IPCEvents.SHARDRESUME, d: { id: this.id, shardID: id } }, { receptive: false });
			}
		});
		this.client.on('disconnected', () => shardUtil.send({ op: IPCEvents.DISCONNECT, d: this.id }, { receptive: false }));
		await this.launch();
	}

	protected abstract launch(): Promise<void> | void;
}

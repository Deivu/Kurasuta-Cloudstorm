import { Worker, fork } from 'cluster';
import { ShardingManager } from '..';
import { IPCEvents } from '../Util/Constants';
import { IPCResult, IPCError } from '../Sharding/ShardClientUtil';
import * as Util from '../Util/Util';
import { EventEmitter } from 'events';

export interface ClusterOptions {
	id: number;
	shards: number[];
	manager: ShardingManager;
}

export class Cluster extends EventEmitter {
	public ready = false;
	public id: number;
	public shards: number[];
	public worker?: Worker;
	public manager: ShardingManager;

	private readonly _exitListenerFunction: (...args: any[]) => void;

	constructor(options: ClusterOptions) {
		super();
		this.id = options.id;
		this.shards = options.shards;
		this.manager = options.manager;
		this._exitListenerFunction = this._exitListener.bind(this);

		this.once('ready', () => { this.ready = true; });
	}

	public async eval(script: string | Function) {
		script = typeof script === 'function' ? `(${script})(this)` : script;
		const { success, d } = await this.manager.ipc.server.sendTo(`Cluster ${this.id}`, { op: IPCEvents.EVAL, d: script }) as IPCResult;
		if (!success) throw Util.makeError(d as IPCError);
		return d;
	}

	public async fetchClientValue(prop: string) {
		const { success, d } = await this.manager.ipc.server.sendTo(`Cluster ${this.id}`, { op: IPCEvents.EVAL, d: `this.${prop}` }) as IPCResult;
		if (!success) throw Util.makeError(d as IPCError);
		return d;
	}

	public kill() {
		if (this.worker) {
			this.manager.emit('debug', `Killing Cluster ${this.id}`);
			this.worker.removeListener('exit', this._exitListenerFunction);
			this.worker.kill();
		}
	}

	public async respawn(delay = 500) {
		this.kill();
		if (delay) await Util.delayFor(delay);
		await this.spawn();
	}

	public send(data: object) {
		return this.manager.ipc.node.sendTo(`Cluster ${this.id}`, data);
	}

	public async spawn() {
		this.worker = fork({ CLUSTER_SHARDS: this.shards.join(','), CLUSTER_ID: this.id, CLUSTER_SHARD_COUNT: this.manager.shardCount, CLUSTER_CLUSTER_COUNT: this.manager.clusterCount });

		this.worker.once('exit', this._exitListenerFunction);

		this.manager.emit('debug', `Worker spawned with id ${this.worker.id}`);

		this.manager.emit('spawn', this);

		await this._waitReady(this.shards.length);
		await Util.sleep(5000);
	}

	private _exitListener(code: number, signal: string) {
		this.ready = false;
		this.worker = undefined;

		if (this.manager.respawn) this.respawn();

		this.manager.emit('debug', `Worker exited with code ${code} and signal ${signal}${this.manager.respawn ? ', restarting...' : ''}`);
	}

	private _waitReady(shardCount: number) {
		return new Promise((resolve, reject) => {
			this.once('ready', resolve);
			setTimeout(() => reject(new Error(`Cluster ${this.id} took too long to get ready`)), (this.manager.timeout * shardCount) * (this.manager.guildsPerShard / 1000));
		});
	}
}

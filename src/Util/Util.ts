// Copyright (c) 2017-2018 dirigeants. All rights reserved. MIT license.

import { ShardingManager, BaseCluster } from '..';

export interface UnkownObject {
	[key: string]: any;
}

interface plainError {
	name: string,
	message: string,
	stack: string
}

export const PRIMITIVE_TYPES = ['string', 'bigint', 'number', 'boolean'];

export function chunk<T>(entries: T[], chunkSize: number) {
	const result = [];
	const amount = Math.floor(entries.length / chunkSize);
	const mod = entries.length % chunkSize;

	for (let i = 0; i < chunkSize; i++) {
		result[i] = entries.splice(0, i < mod ? amount + 1 : amount);
	}

	return result;
}

export function makeError(obj: plainError) {
	const err = new Error(obj.message);
	err.name = obj.name;
	err.stack = obj.stack;
	return err;
}

export function delayFor(ms: number) {
    return new Promise(resolve => {
      setTimeout(resolve, ms);
	});
}

export function deepClone(source: any): any {
	// Check if it's a primitive (with exception of function and null, which is typeof object)
	if (source === null || isPrimitive(source)) return source;
	if (Array.isArray(source)) {
		const output = [];
		for (const value of source) output.push(deepClone(value));
		return output;
	}
	if (isObject(source)) {
		const output = {} as UnkownObject;
		for (const [key, value] of Object.entries(source)) output[key] = deepClone(value);
		return output;
	}
	if (source instanceof Map) {
		const output = new (source.constructor())();
		for (const [key, value] of source.entries()) output.set(key, deepClone(value));
		return output;
	}
	if (source instanceof Set) {
		const output = new (source.constructor())();
		for (const value of source.values()) output.add(deepClone(value));
		return output;
	}
	return source;
}

export function isPrimitive(value: any) {
	return PRIMITIVE_TYPES.includes(typeof value);
}

export function mergeDefault<T>(def: UnkownObject, given: UnkownObject): T {
	if (!given) return deepClone(def);
	for (const key in def) {
		if (typeof given[key] === 'undefined') given[key] = deepClone(def[key]);
		else if (isObject(given[key])) given[key] = mergeDefault(def[key], given[key]);
	}

	return given as any;
}

export function isObject(input: any) {
	return input && input.constructor === Object;
}

export function sleep(duration: number) {
	return new Promise((resolve) => setTimeout(resolve, duration));
}

export function calcShards(shards: number, guildsPerShard: number): number {
	return Math.ceil(shards * (1000 / guildsPerShard));
}

export async function startCluster(manager: ShardingManager) {
	const ClusterClassRequire = await import(manager.path);
	const ClusterClass = ClusterClassRequire.default ? ClusterClassRequire.default : ClusterClassRequire;
	const cluster = new ClusterClass(manager) as BaseCluster;
	return cluster.init();
}

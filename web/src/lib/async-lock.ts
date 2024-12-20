/**
 * ## Example Usage
 *
 * ```typescript
 * const lock = new AsyncLock();
 *
 * async function myAsyncFunction(data) {
 *     const release = await lock.acquire();
 *     try {
 *         // do async operations here
 *     } finally {
 *         release();
 *     }
 * }
 * ```
 */
export class AsyncLock {
	#lastPromise: Promise<void> = Promise.resolve();

	async acquire() {
		let _resolve = () => {};
		const lastPromise = this.#lastPromise;
		this.#lastPromise = new Promise<void>(resolve => {
			_resolve = resolve;
		});
		await lastPromise;
		return _resolve;
	}
}

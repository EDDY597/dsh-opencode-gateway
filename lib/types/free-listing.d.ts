/**
 * The free route's candidate listing, taken from opencode's own answer.
 *
 * The card cannot use the local backend's provider config for this. That view
 * is CREDENTIALED: with `OPENCODE_API_KEY` set, the backend's `opencode`
 * provider reports the paid catalog alongside the free one (measured: 84 models
 * of which 10 are cost-zero), so filtering it by `cost` produced a set that
 * disagreed with what opencode itself shows — it missed free models the
 * credentialed view does not carry at all and kept region-blocked ones it does.
 *
 * `opencode models` answers the free tier exactly when that key is absent, and
 * the `opencode/` prefix separates it from the `opencode-go/` subscription
 * line. The command is the same one the CLI's own model list comes from, so
 * the card and the CLI agree by construction.
 *
 * @module dsh-opencode-gateway/free-listing
 */
/** Drop the cached answer (tests, and any explicit refresh that wants a re-read). */
export declare function resetFreeListingCache(): void;
/** How the free listing is produced; every field has a production default. */
export interface FreeListingOptions {
    /** opencode executable, as configured on the free route. */
    opencodePath: string;
    /** Reuse window for one answer. */
    cacheTtlMs?: number;
    /** Clock, injectable for tests. */
    now?: () => number;
    /** Command runner, injectable for tests. */
    runCommand?: (opencodePath: string) => Promise<string>;
}
/**
 * The free tier's model ids, as opencode reports them.
 *
 * A failed run falls back to the last good answer rather than to an empty
 * list, so a transient spawn failure cannot make the card look like the free
 * tier vanished.
 * @param options - executable path plus test seams.
 * @returns `opencode/<id>` entries; empty only when nothing ever answered.
 */
export declare function listFreeModels(options: FreeListingOptions): Promise<string[]>;
/**
 * Reduce `opencode models` output to the free tier's ids.
 *
 * The command prints one `provider/model` per line; everything outside the
 * `opencode/` prefix belongs to another provider (the `opencode-go/`
 * subscription line in particular) and is not part of the free tier.
 * @param stdout - the command's standard output.
 * @returns unique `opencode/<id>` entries in the order printed.
 */
export declare function parseFreeModelIds(stdout: string): string[];

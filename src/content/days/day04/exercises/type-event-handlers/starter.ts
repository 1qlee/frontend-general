/**
 * Key remapping with `as` — generate props from an events map.
 *
 *   interface PlayerEvents {
 *     play: { at: number };
 *     volumeChange: number;
 *   }
 *   type Props = EventHandlers<PlayerEvents>;
 *   // { onPlay?: (payload: { at: number }) => void;
 *   //   onVolumeChange?: (payload: number) => void }
 *
 * EventHandlers<E>:
 *  - one OPTIONAL prop per string key K of E, named `on${Capitalize<K>}`
 *  - its value is a handler `(payload: E[K]) => void`
 *  - non-string keys (symbols, numbers) are dropped
 *
 * PickByValue<T, V>: keep only the properties of T whose value type is assignable to V.
 *
 *   PickByValue<{ id: number; name: string; age: number }, number>  // { id: number; age: number }
 */
export type EventHandlers<E> = any;

export type PickByValue<T, V> = any;

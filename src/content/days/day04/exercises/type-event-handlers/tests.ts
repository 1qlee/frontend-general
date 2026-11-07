import type { Equal, Expect } from './type-utils';
import type { EventHandlers, PickByValue } from './solution';

interface PlayerEvents {
  play: { at: number };
  pause: { at: number };
  volumeChange: number;
}

// test: creates an optional on<Event> handler per event
type case1 = Expect<
  Equal<
    EventHandlers<PlayerEvents>,
    {
      onPlay?: (payload: { at: number }) => void;
      onPause?: (payload: { at: number }) => void;
      onVolumeChange?: (payload: number) => void;
    }
  >
>;

// test: drops symbol keys
declare const internal: unique symbol;
type WithSymbol = { open: boolean; [internal]: string };
type case2 = Expect<Equal<EventHandlers<WithSymbol>, { onOpen?: (payload: boolean) => void }>>;

// test: an empty events map gives an empty props object
type case3 = Expect<Equal<EventHandlers<{}>, {}>>;

// test: unknown handler names are rejected
// @ts-expect-error — there is no "stop" event
const h1: EventHandlers<PlayerEvents> = { onStop: () => {} };

// test: handler parameter types are checked
// @ts-expect-error — volumeChange carries a number, not a string
const h2: EventHandlers<PlayerEvents> = { onVolumeChange: (v: string) => console.log(v) };

// test: a correct handler object compiles and the payload is inferred
const h3: EventHandlers<PlayerEvents> = { onPlay: (p) => console.log(p.at.toFixed(1)) };

// test: PickByValue keeps only matching properties
type User = { id: number; name: string; age: number; isAdmin: boolean };
type case4 = Expect<Equal<PickByValue<User, number>, { id: number; age: number }>>;

// test: PickByValue works with union targets
type case5 = Expect<Equal<PickByValue<User, string | boolean>, { name: string; isAdmin: boolean }>>;

// test: PickByValue with no matches gives an empty object
type case6 = Expect<Equal<PickByValue<User, bigint>, {}>>;

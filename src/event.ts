import { Task } from "./task";
import { Events } from "./types";

export type BenchEvent = Event & {
  target: Task | null;
  currentTarget: Task | null;
};

export function createBenchEvent(eventType: Events, target: Task | null = null) {
  const event = new Event(eventType);
  const obj: BenchEvent = { ...event, currentTarget: target, target };
  Object.setPrototypeOf(obj, event);
  return obj;
}
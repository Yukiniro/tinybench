import { createBenchEvent } from "./event";
import { Task } from "./task";
import type { Events, Fn, Options, TaskResult } from "./types";
import { now } from "./utils";

/**
 * The Benchmark instance for keeping track of the benchmark tasks and controlling
 * them.
 */
export class Bench extends EventTarget {
  #tasks: Map<string, Task> = new Map();
  signal?: AbortSignal;
  warmupTime = 100;
  warmupIterations = 5;
  time = 500;
  iterations = 10;
  now = now;

  constructor(options: Options = {}) {
    super();
    this.now = options.now ?? this.now;
    this.warmupTime = options.warmupTime ?? this.warmupTime;
    this.warmupIterations = options.warmupIterations ?? this.warmupIterations;
    this.time = options.time ?? this.time;
    this.iterations = options.iterations ?? this.iterations;
    this.signal = options.signal;

    if (this.signal) {
      this.signal.addEventListener(
        "abort",
        () => {
          this.dispatchEvent(createBenchEvent("abort"));
        },
        { once: true }
      );
    }
  }

  /**
   * run the added tasks that were registered using the
   * `add` method
   */
  async run() {
    this.dispatchEvent(createBenchEvent("warmup"));
    for await (const [, task] of this.#tasks) {
      await task.warmup();
    }

    this.dispatchEvent(createBenchEvent("start"));
    const values = await Promise.all(
      [...this.#tasks.entries()].map(([_, task]) => {
        if (this.signal?.aborted) {
          return task;
        }
        return task.run();
      })
    );
    this.dispatchEvent(createBenchEvent("complete"));
    return values;
  }

  /**
   * reset each task and remove its result
   */
  reset() {
    this.dispatchEvent(createBenchEvent("reset"));
    this.#tasks.forEach((task) => {
      task.reset();
    });
  }

  /**
   * add a benchmark task to the task map
   */
  add(name: string, fn: Fn) {
    const task = new Task(this, name, fn);
    this.#tasks.set(name, task);
    this.dispatchEvent(createBenchEvent("add", task));
    return this;
  }

  /**
   * remove a benchmark task from the task map
   */
  remove(name: string) {
    const task = this.getTask(name);
    this.dispatchEvent(createBenchEvent("remove", task));
    this.#tasks.delete(name);
    return this;
  }

  addEventListener(
    type: Events,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ) {
    super.addEventListener(type, listener, options);
  }

  removeEventListener(
    type: Events,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions
  ) {
    super.removeEventListener(type, listener, options);
  }

  /**
   * (getter) tasks results as an array
   */
  get results(): (TaskResult | undefined)[] {
    return [...this.#tasks.values()].map((task) => task.result);
  }

  /**
   * (getter) tasks as an array
   */
  get tasks(): Task[] {
    return [...this.#tasks.values()];
  }

  /**
   * get a task based on the task name
   */
  getTask(name: string): Task | undefined {
    return this.#tasks.get(name);
  }
}
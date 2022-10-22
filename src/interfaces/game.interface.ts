export interface IGame {
  name(): string;
  start(): void;
  stop(): void;
  restart(): void;
}

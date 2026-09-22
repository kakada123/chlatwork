declare module "canvas-confetti" {
  export interface ConfettiOptions {
    particleCount?: number;
    angle?: number;
    spread?: number;
    startVelocity?: number;
    decay?: number;
    gravity?: number;
    ticks?: number;
    scalar?: number;
    zIndex?: number;
    colors?: string[];
    origin?: { x?: number; y?: number };
    disableForReducedMotion?: boolean;
  }

  export interface ConfettiCannon {
    (options?: ConfettiOptions): Promise<void> | null;
    reset(): void;
  }

  interface ConfettiModule extends ConfettiCannon {
    create(
      canvas: HTMLCanvasElement,
      options?: {
        resize?: boolean;
        useWorker?: boolean;
        disableForReducedMotion?: boolean;
      },
    ): ConfettiCannon;
  }

  const confetti: ConfettiModule;
  export default confetti;
}

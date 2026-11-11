// Límite de mensajes por persona en una ventana de tiempo. Protege el costo: cada respuesta se
// paga. Vive en memoria, así que alcanza para una sola instancia del servidor (ver decisiones).
export class RateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  allow(key: string, now: number): boolean {
    const recent = (this.hits.get(key) ?? []).filter((time) => now - time < this.windowMs);

    if (recent.length >= this.limit) {
      this.hits.set(key, recent);
      return false;
    }

    recent.push(now);
    this.hits.set(key, recent);
    return true;
  }
}

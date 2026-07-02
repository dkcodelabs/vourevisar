// Dynamic JSON from external APIs is normalized before it reaches persistence.
export type JsonBoundary = ReturnType<typeof JSON.parse>;

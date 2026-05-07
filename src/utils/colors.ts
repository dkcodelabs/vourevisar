type ColorLeaf = string | number;
type ColorPalette = Record<string, unknown>;

const isRecord = (value: unknown): value is ColorPalette =>
  Boolean(value) &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  Object.getPrototypeOf(value) === Object.prototype;

const isColorLeaf = (value: unknown): value is ColorLeaf =>
  typeof value === "string" || typeof value === "number";

export const flattenColorPalette = (
  colors: unknown,
  prefix = "",
  seen = new WeakSet<object>(),
  depth = 0
): Record<string, ColorLeaf> => {
  if (!isRecord(colors) || seen.has(colors) || depth > 8) {
    return {};
  }

  seen.add(colors);

  return Object.entries(colors).reduce<Record<string, ColorLeaf>>(
    (flattened, [color, value]) => {
      const key = color === "DEFAULT" ? prefix : prefix ? `${prefix}-${color}` : color;

      if (isColorLeaf(value)) {
        flattened[key] = value;
        return flattened;
      }

      if (isRecord(value)) {
        Object.assign(flattened, flattenColorPalette(value, key, seen, depth + 1));
      }

      return flattened;
    },
    {}
  );
};

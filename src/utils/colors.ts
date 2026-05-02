export const flattenColorPalette = (colors: any): any =>
  Object.assign(
    {},
    ...Object.entries(colors ?? {}).flatMap(([color, values]) =>
      typeof values === "object"
        ? Object.entries(flattenColorPalette(values)).map(([number, hex]) => ({
            [color + (number === "DEFAULT" ? "" : `-${number}`)]: hex,
          }))
        : [{ [color]: values }]
    )
  );

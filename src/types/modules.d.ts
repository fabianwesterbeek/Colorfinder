declare module 'xkcd-colors' {
  const xkcdColors: {
    colors: Array<{
      name: string;
      clean_name: string;
      hex: string;
      rgb: [number, number, number];
      rgbf: [number, number, number];
    }>;
    get_color: (name: string) => string | null;
  };

  export default xkcdColors;
}

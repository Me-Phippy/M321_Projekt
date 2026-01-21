// Pixel-Typen für das Pixelboard
export interface PixelColor {
  red: number;
  green: number;
  blue: number;
}

export interface Pixel {
  x: number;
  y: number;
  color: PixelColor;
}

// API Response Format (direkt von der API)
export interface ApiColorResponse {
  Red: number;
  Green: number;
  Blue: number;
}

// Hilfsfunktion: API Response in PixelColor konvertieren
export function convertApiColor(apiColor: ApiColorResponse): PixelColor {
  return {
    red: apiColor.Red,
    green: apiColor.Green,
    blue: apiColor.Blue,
  };
}

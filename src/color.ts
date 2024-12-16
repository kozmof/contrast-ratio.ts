export type RGB = [number, number, number];
export type RGBA = [number, number, number, number];
export type RGB_ = [number, number, number, undefined];

class _ColorInternal {
  readonly fixedAlphaLength = 3

  _setTransparent(): RGBA {
    return [0, 0, 0, 0];
  }

  _toNumber(str: string | undefined, index: number): number {
    if (index === 3 && str === undefined){
      return 1;
    }

    const num = index !== 3 ? Math.round(Number(str)) : Number(Number(str).toFixed(this.fixedAlphaLength));
    if (index !== 3 && (num > 255 || num < 0)) {
      throw new Error(`Invalid string: ${str} at ${index}`);
    } else if (index === 3 && (num > 1 || num < 0)) {
      throw new Error(`Invalid string: ${str} at ${index}`);
    } else {
      return num;
    }
  }

  _isValidFormmat(value: number[]) : value is RGBA {
    return value.length === 4;
  }

  _convertFromCss(css: string): RGBA {
    if (css === 'transparent') {
      return this._setTransparent();
    } else {
      // rgba(255, 100, 50, 1) => ["rgba(255, 100, 50, 1)", "255", "100", "50", "1"]
      // rgba(255, 100, 50) => ["rgba(255, 100, 50, 1)", "255", "100", "50", undefined]
      const extraction = css.match(/rgba?\(([\d.]+), ([\d.]+), ([\d.]+)(?:, ([\d.]+))?\)/);

      if (extraction) {
        extraction.shift();
        const rgba_: number[] = extraction.map((value, index) => this._toNumber(value, index));
        if (this._isValidFormmat(rgba_)) {
          return rgba_;
        }
      }
    }

    throw new Error(`Invalid string: ${css}`);
  }

  _rgb2Rgba(rgb: RGB): RGBA {
    const rgba: RGBA = [...rgb, 1];
    return rgba;
  }

  _normalizeFormat(value: RGB | RGBA | RGB_): RGBA | RGB_ {
    if (value.length === 3) {
      return this._rgb2Rgba(value);
    } else {
      return value;
    }
  }

  _normalizeValue(rgba: RGBA | RGB_): RGBA {
    if (rgba[3] === undefined) {
      return [Math.round(rgba[0]), Math.round(rgba[1]), Math.round(rgba[2]), 1];
    } else {
      return [Math.round(rgba[0]), Math.round(rgba[1]), Math.round(rgba[2]), Number(rgba[3].toFixed(this.fixedAlphaLength))];
    }
  }

  _isRGB(value: number[]): value is RGB {
    return value.length === 3;
  }
}

export type Contrast = {
  ratio: number;
  error: number;
  min: number;
  max: number;
  closest?: Color;
  farthest?: Color;
}

export class Color {
  readonly rgba: RGBA;
  readonly _ci = new _ColorInternal();
  readonly _BLACK: RGB = [0, 0, 0];
  readonly _GRAY: RGB = [127.5, 127.5, 127.5];
  readonly _WHITE: RGB = [255, 255, 255];

  constructor(value: string | RGB | RGBA | RGB_) {
    const rgba: RGBA = typeof value === 'string' ? (
      this._ci._convertFromCss(value)
    ) : (
      this._ci._normalizeValue(this._ci._normalizeFormat(value))
    )
    this.rgba = rgba;
  }

  get rgb(): RGB {
    const rgb = this.rgba.slice(0, 3);
    if (this._ci._isRGB(rgb)) {
      return rgb;
    } else {
      throw new Error(`Invalid RGB format: ${rgb.toString()}`);
    }
  }

  get alpha(): number {
    return this.rgba[3];
  }

  set alpha(alpha: number) {
    this.rgba[3] = Number(alpha.toFixed(this._ci.fixedAlphaLength));
  }

  get luminance(): number {
    // Formula: https://www.w3.org/TR/WCAG22/#dfn-relative-luminance
    // ==================================================================================
    // > Before May 2021 the value of 0.04045 in the definition was different (0.03928).
    // > It was taken from an older version of the specification and has been updated.
    // > It has no practical effect on the calculations in the context of these guidelines.

    const rgba = this.rgba.slice();

    for (let i = 0; i < 3; i++) {
      let rgb = rgba[i];

      rgb /= 255;

      // rgb = rgb < .03928 ? rgb / 12.92 : Math.pow((rgb + .055) / 1.055, 2.4);
      rgb = rgb <= .04045 ? rgb / 12.92 : Math.pow((rgb + .055) / 1.055, 2.4);

      rgba[i] = rgb;
    }

    return .2126 * rgba[0] + .7152 * rgba[1] + 0.0722 * rgba[2];
  }

  get inverse(): Color {
    return new Color([
      255 - this.rgba[0],
      255 - this.rgba[1],
      255 - this.rgba[2],
      this.alpha
    ]);
  }

  toString(): string {
    return 'rgb' + (this.alpha < 1 ? 'a' : '') + '(' + this.rgba.slice(0, this.alpha >= 1 ? 3 : 4).join(', ') + ')';
  }

  /**
   * @param {boolean} withAlpha If the output should include the alpha channel.
   * @returns {string} A hex color string in the format `#RRGGBB` or `#RRGGBBAA.
   */
  toHex(withAlpha: boolean = true): string {
    const [r, g, b, a] = this.rgba;
    const uint8ToHex = function (uint8: number) { return uint8.toString(16).padStart(2, '0'); }

    let result = `#${uint8ToHex(r)}${uint8ToHex(g)}${uint8ToHex(b)}`;

    if (withAlpha) {
      const aHex = uint8ToHex(a * 255);
      result += aHex.split(".")[0];
    }

    return result;
  }

  clone(): Color {
    return new Color(this.rgba);
  }

  // Overlay a color over another
  overlayOn(color: Color): Color {
    const overlaid = this.clone();

    const alpha = this.alpha;

    if (alpha >= 1) {
      return overlaid;
    }

    for (let i = 0; i < 3; i++) {
      overlaid.rgba[i] = Math.round(overlaid.rgba[i] * alpha + color.rgba[i] * color.rgba[3] * (1 - alpha));
    }
    overlaid.alpha = alpha + color.rgba[3] * (1 - alpha)

    return overlaid;
  }

  contrast(color: Color): Contrast {
    // Formula: http://www.w3.org/TR/2008/REC-WCAG20-20081211/#contrast-ratiodef
    const alpha = this.alpha;

    if (alpha >= 1) {
      if (color.alpha < 1) {
        color = color.overlayOn(this);
      }

      const l1 = this.luminance + .05
      const l2 = color.luminance + .05
      let ratio = l1 / l2;

      if (l2 > l1) {
        ratio = 1 / ratio;
      }

      return {
        ratio: ratio,
        error: 0,
        min: ratio,
        max: ratio
      };
    }

    // If we’re here, it means we have a semi-transparent background
    // The text color may or may not be semi-transparent, but that doesn't matter

    const onBlack = this.overlayOn(new Color(this._BLACK)),
      onWhite = this.overlayOn(new Color(this._WHITE)),
      contrastOnBlack = onBlack.contrast(color).ratio,
      contrastOnWhite = onWhite.contrast(color).ratio;

    // One of the larger ratios between contrasts of black and white
    const max = Math.max(contrastOnBlack, contrastOnWhite);

    // This is here for backwards compatibility and not used to calculate
    // `min`.  Note that there may be other colors with a closer luminance to
    // `color` if they have a different hue than `this`.
    const result = this.rgb.map(function (c, i) {
      return Math.min(Math.max(0, (color.rgb[i] - c * alpha) / (1 - alpha)), 255);
    });
    const closestRGB: RGB | null = this._ci._isRGB(result) ? result : null;
    const closest = closestRGB !== null ? new Color(closestRGB) : null;
    if (closest === null) {
      throw new Error("Falied to get a closest color.");
    }

    let min = 1;
    if (onBlack.luminance > color.luminance) {
      min = contrastOnBlack;
    }
    else if (onWhite.luminance < color.luminance) {
      min = contrastOnWhite;
    }

    return {
      ratio: (min + max) / 2,
      error: (max - min) / 2,
      min: min,
      max: max,
      closest: closest,
      farthest: contrastOnWhite === max ? new Color(this._WHITE) : new Color(this._BLACK)
    };
  }
}


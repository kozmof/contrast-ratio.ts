import { expect, test, describe } from "vitest";
import { Color } from "./color";

describe("Init test", () => {
  test("Construct by RGBA of CSS", () => {
    const color = new Color("rgba(100, 255, 255, 0.5)");
    expect(color.rgba).toEqual([100, 255, 255, 0.5])
  })
  test("Construct by RGBA of CSS(wrong format but accepted)", () => {
    const color = new Color("rgb(100, 255, 255, 0.5)");
    expect(color.rgba).toEqual([100, 255, 255, 0.5])
  })
  test("Construct by RGBA of Array", () => {
    const color = new Color([100, 255, 255, 0.5]);
    expect(color.rgba).toEqual([100, 255, 255, 0.5])
  })
  test("Construct by RGB of CSS", () => {
    const color = new Color("rgb(100, 255, 255)");
    expect(color.rgba).toEqual([100, 255, 255, 1])
  })
  test("Construct by RGB of CSS(wrong format but accepted)", () => {
    const color = new Color("rgba(100, 255, 255)");
    expect(color.rgba).toEqual([100, 255, 255, 1])
  })
  test("Construct by RGB of Array", () => {
    const color = new Color([100, 255, 255]);
    expect(color.rgba).toEqual([100, 255, 255, 1])
  })
  test("Construct by CSS transparent", () => {
    const color = new Color("transparent");
    expect(color.rgba).toEqual([0, 0, 0, 0])
  })
})

describe("Getter", () => {
  test("Get RGB value", () => {
    const color = new Color([100, 255, 255, 0.5]);
    expect(color.rgb).toEqual([100, 255, 255])
  })
  test("Get Alpha value", () => {
    const color = new Color([100, 255, 255, 0.5]);
    expect(color.alpha).toEqual(0.5)
  })
  test("Get Luminance value", () => {
    // test data is calculated by https://contrastchecker.online/color-relative-luminance-calculator
    const color1 = new Color([32, 150, 223, 1]);
    expect(color1.luminance.toFixed(10)).toEqual((0.2744748197).toString())
    const color2 = new Color([102, 14, 94, 1]);
    expect(color2.luminance.toFixed(10)).toEqual((0.0394700858).toString())
    const color3 = new Color([239, 236, 134, 1]);
    expect(color3.luminance.toFixed(10)).toEqual((0.8006285816).toString())
  })
  test("Get Inverse Color", () => {
    const color = new Color([100, 255, 255, 0.5]);
    expect(color.inverse.rgba).toEqual([155, 0, 0, 0.5])
  })
})

describe("Setter", () => {
  test("Set alpha", () => {
    const color = new Color([100, 255, 255, 0.5]);
    color.alpha = 1;
    expect(color.rgba).toEqual([100, 255, 255, 1])
  })
})

describe("Conversion", () => {
  test("Convert to string", () => {
    const color = new Color([53, 66, 240, 1]);
    expect(color.toString()).toEqual("rgb(53, 66, 240)")
    const colorAlpha = new Color([53, 66, 240, 0.1]);
    expect(colorAlpha.toString()).toEqual("rgba(53, 66, 240, 0.1)")
  })
  test("Convert to hex code", () => {
    const color = new Color([53, 66, 240, 1]);
    expect(color.toHex()).toEqual("#3542f0ff")
    const colorAlpha = new Color([0, 128, 255, 0.502]);
    expect(colorAlpha.toHex()).toEqual("#0080ff80")
  })
  test("Clone", () => {
    const color = new Color([53, 66, 240, 1]);
    expect(color === color).toEqual(true);
    expect(color === color.clone()).toEqual(false);
  })
  test("Overlay a color", () => {
    const color1 = new Color([53, 66, 240, 1]);
    expect(color1.overlayOn(new Color([255, 255, 255, 1])).rgba).toEqual([53, 66, 240, 1])
    const color2 = new Color([53, 66, 240, 0.2]);
    expect(color2.overlayOn(new Color([255, 255, 255, 1])).rgba).toEqual([215, 217, 252, 1])
    const color3 = new Color([53, 66, 240, 0.7]);
    expect(color3.overlayOn(new Color([255, 255, 255, 0.3])).rgba).toEqual([60, 69, 191, 0.79])
  })
})

describe("Contrast", () => {
  test("Different alpha (checked only validities of an output format)", () => {
    const color1 = new Color([53, 66, 240, 1]);
    const color2 = new Color([53, 66, 240, 0.5]);
    expect(color1.contrast(color2)).toEqual({
      error: 0,
      max: 1,
      min: 1,
      ratio: 1
    })
  })
  // test data is calculated by https://webaim.org/resources/contrastchecker/
  test("Different colors without alpha", () => {
    const color1 = new Color([0, 0, 255, 1]);
    const color2 = new Color([255, 255, 255, 1]);
    const contrast1 = color1.contrast(color2);
    expect(contrast1.error).toEqual(0);
    expect(contrast1.min.toFixed(2)).toEqual((8.59).toString());
    expect(contrast1.max.toFixed(2)).toEqual((8.59).toString());
    expect(contrast1.ratio.toFixed(2)).toEqual((8.59).toString());

    const color3 = new Color([0, 0, 255, 1]);
    const color4 = new Color([254, 77, 77, 1]);
    const contrast2 = color3.contrast(color4);
    expect(contrast2.error).toEqual(0);
    expect(contrast2.min.toFixed(2)).toEqual((2.61).toString());
    expect(contrast2.max.toFixed(2)).toEqual((2.61).toString());
    expect(contrast2.ratio.toFixed(2)).toEqual((2.61).toString());

    const color5 = new Color([155, 171, 162, 1]);
    const color6 = new Color([254, 77, 77, 1]);
    const contrast3 = color5.contrast(color6);
    expect(contrast3.error).toEqual(0);
    expect(contrast3.min.toFixed(2)).toEqual((1.37).toString());
    expect(contrast3.max.toFixed(2)).toEqual((1.37).toString());
    expect(contrast3.ratio.toFixed(2)).toEqual((1.37).toString());
  })
  test("Different colors with alpha (checked only validities of an output format)", () => {
    const color1 = new Color([155, 171, 162, 0.36]);
    const color2 = new Color([46, 0, 0, 1]);
    const contrast1 = color1.contrast(color2);
    expect(contrast1.error.toFixed(2)).toEqual((6.23).toString());
    expect(contrast1.min.toFixed(2)).toEqual((1.72).toString());
    expect(contrast1.max.toFixed(2)).toEqual((14.19).toString());
    expect(contrast1.ratio.toFixed(2)).toEqual((7.95).toString());
    expect(contrast1.closest?.rgba).toEqual([0, 0, 0, 1]);
  })
})

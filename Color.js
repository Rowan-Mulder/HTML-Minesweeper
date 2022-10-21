class Color {
    constructor(hexColor = "#FFFFFF") {
        this.init(hexColor)
    }

    init(hexColor = "#FFFFFF") {
        this._color = this.hexToColor(hexColor)
        this.r = this._color.r
        this.g = this._color.g
        this.b = this._color.b
    }

    hexToColor(hexColor = "#FFFFFF") {
        let hexColorConvert = hexColor.trim().replace("#", "")

        if (hexColorConvert.length === 6) {
            let r = this.hexToDec(hexColorConvert.substr(0,2))
            let g = this.hexToDec(hexColorConvert.substr(2,2))
            let b = this.hexToDec(hexColorConvert.substr(4,2))
            return {r, g, b}
        } else if (hexColorConvert.length === 3) {
            // https://www.w3.org/TR/2001/WD-css3-color-20010305#colorunits
            let r = this.hexToDec(`${hexColorConvert.substr(0,1)}${hexColorConvert.substr(0,1)}`)
            let g = this.hexToDec(`${hexColorConvert.substr(1,1)}${hexColorConvert.substr(1,1)}`)
            let b = this.hexToDec(`${hexColorConvert.substr(2,1)}${hexColorConvert.substr(2,1)}`)
            return {r, g, b}
        } else {
            return {r: 255, g: 255, b: 255}
        }
    }

    hexToDec(hex = "FF") {
        return parseInt(hex, 16)
    }

    rgbToHex(r = 255, g = 255, b = 255) {
        return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`
    }

    toHSL() {
        return this.rgbToHSL(this.r, this.g, this.b)
    }

    // https://css-tricks.com/converting-color-spaces-in-javascript/#aa-rgb-to-hsl
    rgbToHSL(r = 255, g = 255, b = 255) {
        // Make r, g, and b fractions of 1
        r /= 255
        g /= 255
        b /= 255

        // Find greatest and smallest channel values
        let cmin = Math.min(r,g,b),
            cmax = Math.max(r,g,b),
            delta = cmax - cmin,
            h,s,l

        // Calculate hue
        // No difference
        if (delta === 0)
            h = 0
        // Red is max
        else if (cmax === r)
            h = ((g - b) / delta) % 6
        // Green is max
        else if (cmax === g)
            h = (b - r) / delta + 2
        // Blue is max
        else
            h = (r - g) / delta + 4

        h = Math.round(h * 60)

        // Make negative hues positive behind 360°
        if (h < 0)
            h += 360

        // Calculate lightness
        l = (cmax + cmin) / 2

        // Calculate saturation
        s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1))

        // Multiply l and s by 100
        s = +(s * 100).toFixed(1)
        l = +(l * 100).toFixed(1)

        return {h, s, l}
    }

    // https://css-tricks.com/converting-color-spaces-in-javascript/#aa-hsl-to-rgb
    hslToRGB(h = 0, s = 0, l = 100) {
        h = Math.min(Math.max(0, h), 360)
        s = Math.min(Math.max(0, s), 100)
        l = Math.min(Math.max(0, l), 100)

        s /= 100
        l /= 100

        let c = (1 - Math.abs(2 * l - 1)) * s,
            x = c * (1 - Math.abs((h / 60) % 2 - 1)),
            m = l - c/2,
            r = 0,
            g = 0,
            b = 0

        if (0 <= h && h < 60) {
            r = c; g = x; b = 0
        } else if (60 <= h && h < 120) {
            r = x; g = c; b = 0
        } else if (120 <= h && h < 180) {
            r = 0; g = c; b = x
        } else if (180 <= h && h < 240) {
            r = 0; g = x; b = c
        } else if (240 <= h && h < 300) {
            r = x; g = 0; b = c
        } else if (300 <= h && h < 360) {
            r = c; g = 0; b = x
        }
        r = Math.round((r + m) * 255)
        g = Math.round((g + m) * 255)
        b = Math.round((b + m) * 255)

        return {r, g, b}
    }

    brighten(amount = 1.0) {
        return this.hslAdjust('l', amount)
    }

    saturate(amount = 1.0) {
        return this.hslAdjust('s', amount)
    }

    hslAdjust(char = 'h', amount = 1.0) {
        if (['h','s','l'].indexOf(char) === -1) {
            return
        }

        let hslColor = this.rgbToHSL(this.r, this.g, this.b)
        eval(`hslColor.${char} *= amount`)
        let rgbColor = this.hslToRGB(hslColor.h, hslColor.s, hslColor.l)

        this.r = rgbColor.r; this.g = rgbColor.g; this.b = rgbColor.b
        this._color = {r: this.r, g: this.g, b: this.b}
        return this.rgbToHex(this.r, this.g, this.b)
    }
}

export default Color
import type { RGBColor } from '../types/editor'


export function getTerritoryColor(
  	territoryId: number
): RGBColor {

	/*
	* Generamos colores diferentes
	* de forma determinista.
	*
	* El mismo ID siempre obtiene
	* el mismo color.
	*/

	const hue =
		(territoryId * 137.508) % 360

	return hslToRgb(
		hue,
		55,
		78
	)
}


export const NEUTRAL_TERRITORY_COLOR: RGBColor = {
    r: 225,
    g: 225,
    b: 225,
}


export const TERRITORY_CREATION_PREVIEW_COLOR: RGBColor = {
    r: 40,
    g: 150,
    b: 255,
}


function hslToRgb(
	h: number,
	s: number,
	l: number
): RGBColor {

	s /= 100
	l /= 100


	const c =
		(1 - Math.abs(2 * l - 1)) * s


  	const x =
    	c *
		(
			1 -
			Math.abs(
				((h / 60) % 2) - 1
			)
		)


	const m =
		l - c / 2


	let r = 0
	let g = 0
	let b = 0


	if (h < 60) {
		r = c
		g = x
	}

	else if (h < 120) {
		r = x
		g = c
	}

	else if (h < 180) {
		g = c
		b = x
	}

	else if (h < 240) {
		g = x
		b = c
	}

	else if (h < 300) {
		r = x
		b = c
	}

	else {
		r = c
		b = x
	}


	return {
		r: Math.round((r + m) * 255),
		g: Math.round((g + m) * 255),
		b: Math.round((b + m) * 255),
	}
}

export function hexToRgb(
    hex: string
): RGBColor | null {

    const match =
        /^#([0-9a-f]{6})$/i.exec(
            hex
        )


    if (match === null) {
        return null
    }


    const value =
        parseInt(
            match[1],
            16
        )


    return {
        r:
            (value >> 16) & 255,

        g:
            (value >> 8) & 255,

        b:
            value & 255,
    }
}
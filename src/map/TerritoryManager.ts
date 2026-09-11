import {
	MAP_WIDTH,
	MAP_HEIGHT,
} from '../config/mapConfig'

import type {
  	Territory,
	RGBColor,
} from '../types/editor'

import {
  	NEUTRAL_TERRITORY_COLOR,
} from './colors'

import {
  	findClosedRegion,
} from './floodFill'


export type CreateTerritoryResult =
	| {
		status: 'created'
		territory: Territory
		seedX: number
		seedY: number
		}
	| {
		status: 'existing'
		territory: Territory
		}
	| {
		status: 'not-closed'
		}
	| {
		status: 'invalid'
		}


export class TerritoryManager {

	private context: CanvasRenderingContext2D

	private territoryIds: Uint32Array

	private territories =
		new Map<number, Territory>()

	private territoryImageData: ImageData

	private nextTerritoryId = 1

	private territoryPixels = new Map<number, Int32Array>()


	constructor(
		canvas: HTMLCanvasElement
	) {

    	const context =
      		canvas.getContext('2d')

		if (context === null) {
			throw new Error(
				`No se pudo obtener el contexto 2D de #${canvas.id}`
			)
		}

    	this.context = context

		this.territoryIds =
			new Uint32Array(
					MAP_WIDTH * MAP_HEIGHT
			)

		this.territoryImageData =
			this.context.createImageData(
				MAP_WIDTH,
				MAP_HEIGHT
			)
  	}


	// --------------------------------------------------
	// RESET
	// --------------------------------------------------

  	public reset() {

    /*
		* 0 significa que el píxel
		* no pertenece a ningún territorio.
		*/
		this.territoryIds.fill(0)

		this.territories.clear()

		this.territoryPixels.clear()

		/*
		* RGBA = 255,255,255,255
		* Fondo blanco opaco.
		*/
		this.territoryImageData.data.fill(
			255
		)

		this.context.putImageData(
			this.territoryImageData,
			0,
			0
    	)

    	this.nextTerritoryId = 1
  	}


	// --------------------------------------------------
	// CREAR TERRITORIO
	// --------------------------------------------------

	public createAt(
		x: number,
		y: number,
		borderPixels: Uint8ClampedArray
	): CreateTerritoryResult {

		const pixelX =
			Math.floor(x)

		const pixelY =
			Math.floor(y)

		if (
			!this.isInsideMap(
					pixelX,
					pixelY
			)
    	) {

		return {
			status: 'invalid',
		}
    	}

		const index =
			pixelY * MAP_WIDTH +
			pixelX

		const existingId =
			this.territoryIds[index]

		/*
		* Ya existe un territorio
		* en este píxel.
		*/
		if (existingId !== 0) {

			const territory =
				this.territories.get(
					existingId
				)

			if (territory === undefined) {
				return {
					status: 'invalid',
				}
			}

			return {
				status: 'existing',
				territory,
			}
    	}

		const region =
			this.findRegion(
				pixelX,
				pixelY,
				borderPixels
			)

    	if (region === null) {

			return {
				status: 'not-closed',
			}
    	}

		const territoryId =
			this.nextTerritoryId++

		const territory: Territory = {
			id: territoryId,

      		name:
        		`Territorio ${territoryId}`,
    	}

		this.territories.set(
			territoryId,
			territory
    	)

		this.paintTerritory(
			territoryId,
			region
		)

		return {
			status: 'created',

			territory,

			seedX: pixelX,
			seedY: pixelY,
		}
  	}


	// --------------------------------------------------
	// RECREAR DESDE HISTORIAL
	// --------------------------------------------------

	public recreate(
		territoryId: number,
		seedX: number,
		seedY: number,
		borderPixels: Uint8ClampedArray
  	): boolean {

		const region =
			this.findRegion(
				seedX,
				seedY,
				borderPixels
			)

		if (region === null) {
			return false
		}

		const territory: Territory = {
			id: territoryId,

			name:
				`Territorio ${territoryId}`,
    	}

		this.territories.set(
			territoryId,
			territory
		)

		this.paintTerritory(
			territoryId,
			region
		)

		/*
		* Importante para undo/redo.
		*
		* Si reconstruimos el Territorio 5,
		* el siguiente deberá ser al menos 6.
		*/
		this.nextTerritoryId =
			Math.max(
				this.nextTerritoryId,
				territoryId + 1
			)

    	return true
  	}


	// --------------------------------------------------
	// CONSULTAR TERRITORIO
	// --------------------------------------------------

	public getAt(
		x: number,
		y: number
	): Territory | null {

		const pixelX =
			Math.floor(x)

		const pixelY =
			Math.floor(y)

		if (
			!this.isInsideMap(
				pixelX,
				pixelY
		)
    	) {
      		return null
    	}

		const index =
			pixelY * MAP_WIDTH +
			pixelX

		const territoryId =
			this.territoryIds[index]

		if (territoryId === 0) {
			return null
		}

		return (
			this.territories.get(
				territoryId
			)
			?? null
    	)
  	}

	// --------------------------------------------------
	// BUSCAR REGIÓN DISPONIBLE
	// --------------------------------------------------

	public findAvailableRegionAt(
		x: number,
		y: number,
		borderPixels: Uint8ClampedArray
	): Int32Array | null {

		const pixelX =
			Math.floor(x)

		const pixelY =
			Math.floor(y)

		if (
			!this.isInsideMap(
				pixelX,
				pixelY
			)
		) {
			return null
		}

		return this.findRegion(
			pixelX,
			pixelY,
			borderPixels
		)
	}


	// --------------------------------------------------
	// ENCONTRAR REGIÓN
	// --------------------------------------------------

  	private findRegion(
		startX: number,
		startY: number,
		borderPixels: Uint8ClampedArray
  	): Int32Array | null {

		return findClosedRegion({
			startX,
			startY,

			width:
				MAP_WIDTH,

			height:
				MAP_HEIGHT,

			territoryIds:
				this.territoryIds,

			borderPixels,
		})
	}


	// --------------------------------------------------
	// PINTAR TERRITORIO
	// --------------------------------------------------

	private paintTerritory(
		territoryId: number,
		pixels: Int32Array
	) {

		this.territoryPixels.set(
			territoryId,
			pixels
		)


		for (
			let i = 0;
			i < pixels.length;
			i++
		) {

			this.territoryIds[
				pixels[i]
			] = territoryId
		}


		this.paintPixels(
			pixels,
			NEUTRAL_TERRITORY_COLOR
		)
	}

	private paintPixels(
		pixels: Int32Array,
		color: RGBColor
	) {

		for (
			let i = 0;
			i < pixels.length;
			i++
		) {

			const imageIndex =
				pixels[i] * 4


			this.territoryImageData.data[
				imageIndex
			] = color.r


			this.territoryImageData.data[
				imageIndex + 1
			] = color.g


			this.territoryImageData.data[
				imageIndex + 2
			] = color.b


			this.territoryImageData.data[
				imageIndex + 3
			] = 255
		}


		this.context.putImageData(
			this.territoryImageData,
			0,
			0
		)
	}


	// --------------------------------------------------
	// LÍMITES
	// --------------------------------------------------

	private isInsideMap(
		x: number,
		y: number
	): boolean {
		return (
			x >= 0 &&
			y >= 0 &&
			x < MAP_WIDTH &&
			y < MAP_HEIGHT
		)
	}

	// --------------------------------------------------
	// OBTENER TERRITORIO POR ID
	// --------------------------------------------------

	public getById(
		territoryId: number
	): Territory | null {

		return (
			this.territories.get(
				territoryId
			)
			?? null
		)
	}


	// --------------------------------------------------
	// RENOMBRAR TERRITORIO
	// --------------------------------------------------

	public rename(
		territoryId: number,
		name: string
	): Territory | null {

		const territory =
			this.territories.get(
				territoryId
			)

		if (territory === undefined) {
			return null
		}

		const cleanName =
			name.trim()

		if (cleanName.length === 0) {
			return null
		}

		territory.name =
			cleanName

		return territory
	}

	// --------------------------------------------------
	// CAMBIAR COLOR
	// --------------------------------------------------

	public setColor(
		territoryId: number,
		color: RGBColor
	): boolean {

		const pixels =
			this.territoryPixels.get(
				territoryId
			)


		if (pixels === undefined) {
			return false
		}


		this.paintPixels(
			pixels,
			color
		)


		return true
	}


	// --------------------------------------------------
	// PÍXELES DE UN TERRITORIO
	// --------------------------------------------------

	public getRegionPixels(
		territoryId: number
	): Int32Array | null {

		return (
			this.territoryPixels.get(
				territoryId
			)
			?? null
		)
	}


	// --------------------------------------------------
	// COLOR NEUTRO
	// --------------------------------------------------

	public setNeutralColor(
		territoryId: number
	): boolean {

		return this.setColor(
			territoryId,
			NEUTRAL_TERRITORY_COLOR
		)
	}


	// --------------------------------------------------
	// OBTENER TODOS LOS TERRITORIOS
	// --------------------------------------------------

	public getAll(): Territory[] {

		return Array.from(
			this.territories.values()
		).map(
			territory => ({
				...territory,
			})
		)
	}


	// --------------------------------------------------
	// OBTENER RASTER
	// --------------------------------------------------

	public getTerritoryIdsCopy(): Uint32Array {

		return this.territoryIds.slice()
	}


	// --------------------------------------------------
	// CARGAR ESTADO
	// --------------------------------------------------

	public loadState(
		territories: Territory[],
		territoryIds: Uint32Array
	) {

		const expectedSize =
			MAP_WIDTH * MAP_HEIGHT


		if (
			territoryIds.length !==
			expectedSize
		) {
			throw new Error(
				'El raster de territorios tiene un tamaño inválido'
			)
		}


		this.territories.clear()

		this.territoryPixels.clear()


		this.territoryIds =
			territoryIds.slice()


		/*
		* Primero dejamos todo blanco.
		*/
		this.territoryImageData.data.fill(
			255
		)


		const pixelCounts =
			new Map<number, number>()


		let highestTerritoryId =
			0


		// -----------------------------
		// RECREAR METADATOS
		// -----------------------------

		for (
			const territory of territories
		) {

			if (
				territory.id <= 0 ||
				!Number.isInteger(
					territory.id
				) ||
				this.territories.has(
					territory.id
				)
			) {
				throw new Error(
					'ID de territorio inválido'
				)
			}


			this.territories.set(
				territory.id,
				{
					...territory,
				}
			)


			pixelCounts.set(
				territory.id,
				0
			)


			highestTerritoryId =
				Math.max(
					highestTerritoryId,
					territory.id
				)
		}


		// -----------------------------
		// CONTAR PÍXELES
		// -----------------------------

		for (
			let i = 0;
			i < this.territoryIds.length;
			i++
		) {

			const territoryId =
				this.territoryIds[i]


			if (territoryId === 0) {
				continue
			}


			const currentCount =
				pixelCounts.get(
					territoryId
				)


			if (currentCount === undefined) {
				throw new Error(
					`El raster referencia un territorio inexistente: ${territoryId}`
				)
			}


			pixelCounts.set(
				territoryId,
				currentCount + 1
			)


			const imageIndex =
				i * 4


			this.territoryImageData.data[
				imageIndex
			] =
				NEUTRAL_TERRITORY_COLOR.r

			this.territoryImageData.data[
				imageIndex + 1
			] =
				NEUTRAL_TERRITORY_COLOR.g

			this.territoryImageData.data[
				imageIndex + 2
			] =
				NEUTRAL_TERRITORY_COLOR.b

			this.territoryImageData.data[
				imageIndex + 3
			] = 255
		}


		// -----------------------------
		// CREAR BUFFERS
		// -----------------------------

		const writePositions =
			new Map<number, number>()


		for (
			const [
				territoryId,
				count,
			] of pixelCounts
		) {

			this.territoryPixels.set(
				territoryId,
				new Int32Array(
					count
				)
			)


			writePositions.set(
				territoryId,
				0
			)
		}


		// -----------------------------
		// LLENAR BUFFERS
		// -----------------------------

		for (
			let i = 0;
			i < this.territoryIds.length;
			i++
		) {

			const territoryId =
				this.territoryIds[i]


			if (territoryId === 0) {
				continue
			}


			const pixels =
				this.territoryPixels.get(
					territoryId
				)


			const writePosition =
				writePositions.get(
					territoryId
				)


			if (
				pixels === undefined ||
				writePosition === undefined
			) {
				continue
			}


			pixels[
				writePosition
			] = i


			writePositions.set(
				territoryId,
				writePosition + 1
			)
		}


		this.context.putImageData(
			this.territoryImageData,
			0,
			0
		)


		this.nextTerritoryId =
			highestTerritoryId + 1
	}
}


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


export type SplitTerritoryResult =
    | {
        status: 'split'
        originalTerritoryId: number
        newTerritoryId: number
    }
    | {
        status:
            | 'invalid-territory'
            | 'not-divided'
            | 'too-many-parts'
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


	// --------------------------------------------------
	// ELIMINAR TERRITORIO
	// --------------------------------------------------
	public delete(
		territoryId: number
	): Territory | null {

		const territory =
			this.territories.get(
				territoryId
			)

		if (territory === undefined) {
			return null
		}

		const pixels =
			this.territoryPixels.get(
				territoryId
			)

		if (pixels === undefined) {
			return null
		}

		/*
		* Los píxeles dejan de pertenecer
		* a cualquier territorio.
		*/
		for (
			let i = 0;
			i < pixels.length;
			i++
		) {

			const pixelIndex =
				pixels[i]


			this.territoryIds[
				pixelIndex
			] = 0
		}

		/*
		* Al eliminar el territorio queremos
		* que la región vuelva a verse vacía,
		* no como territorio neutral.
		*/
		this.paintPixels(
			pixels,
			{
				r: 255,
				g: 255,
				b: 255,
			}
		)

		this.territories.delete(
			territoryId
		)

		this.territoryPixels.delete(
			territoryId
		)

		return {
			...territory,
		}
	}


	// --------------------------------------------------
	// DIVIDIR TERRITORIO
	// --------------------------------------------------
	public split(
		territoryId: number,
		borderPixels: Uint8ClampedArray,
		requestedNewTerritoryId:
			number | null = null
	): SplitTerritoryResult {

		const territory =
			this.territories.get(
				territoryId
			)

		const originalPixels =
			this.territoryPixels.get(
				territoryId
			)

		if (
			territory === undefined ||
			originalPixels === undefined
		) {

			return {
				status:
					'invalid-territory',
			}
		}

		const components =
			this.findTerritoryComponents(
				territoryId,
				originalPixels,
				borderPixels
			)

		/*
		* Una línea que no atraviesa
		* completamente el territorio
		* sigue dejando una sola región.
		*/
		if (
			components.length < 2
		) {

			return {
				status:
					'not-divided',
			}
		}

		/*
		* Por ahora una división debe
		* producir exactamente dos partes.
		*/
		if (
			components.length > 2
		) {

			return {
				status:
					'too-many-parts',
			}
		}

		/*
		* Ordenamos por tamaño.
		*
		* La región más grande conserva
		* automáticamente el territorio
		* original.
		*
		* En empate usamos el índice del
		* primer píxel para que el resultado
		* sea siempre determinista.
		*/
		components.sort(
			(
				a,
				b
			) => {

				const sizeDifference =
					b.length -
					a.length


				if (
					sizeDifference !== 0
				) {
					return sizeDifference
				}

				return (
					a[0] -
					b[0]
				)
			}
		)

		const originalComponent =
			components[0]

		const newComponent =
			components[1]

		let newTerritoryId:
			number

		if (
			requestedNewTerritoryId !==
			null
		) {

			if (
				requestedNewTerritoryId <= 0 ||
				requestedNewTerritoryId ===
					territoryId ||
				this.territories.has(
					requestedNewTerritoryId
				)
			) {

				return {
					status:
						'invalid-territory',
				}
			}

			newTerritoryId =
				requestedNewTerritoryId

			this.nextTerritoryId =
				Math.max(
					this.nextTerritoryId,
					newTerritoryId + 1
				)
		}

		else {

			newTerritoryId =
				this.nextTerritoryId++
		}

		/*
		* Guardamos el color actual.
		*
		* Así, si pertenecía a un país,
		* ambas partes conservan visualmente
		* ese color.
		*/
		const samplePixel =
			originalComponent[0]

		const sampleOffset =
			samplePixel * 4

		const color = {

			r:
				this.territoryImageData
					.data[
						sampleOffset
					],

			g:
				this.territoryImageData
					.data[
						sampleOffset + 1
					],

			b:
				this.territoryImageData
					.data[
						sampleOffset + 2
					],
		}

		/*
		* Primero liberamos toda la región
		* anterior.
		*/
		for (
			let i = 0;
			i < originalPixels.length;
			i++
		) {

			const pixelIndex =
				originalPixels[i]


			this.territoryIds[
				pixelIndex
			] = 0


			const offset =
				pixelIndex * 4


			this.territoryImageData
				.data[
					offset
				] = 255

			this.territoryImageData
				.data[
					offset + 1
				] = 255

			this.territoryImageData
				.data[
					offset + 2
				] = 255

			this.territoryImageData
				.data[
					offset + 3
				] = 255
		}

		/*
		* Región principal:
		* conserva ID y nombre.
		*/
		for (
			let i = 0;
			i < originalComponent.length;
			i++
		) {

			const pixelIndex =
				originalComponent[i]

			this.territoryIds[
				pixelIndex
			] = territoryId

			const offset =
				pixelIndex * 4

			this.territoryImageData
				.data[
					offset
				] = color.r

			this.territoryImageData
				.data[
					offset + 1
				] = color.g

			this.territoryImageData
				.data[
					offset + 2
				] = color.b

			this.territoryImageData
				.data[
					offset + 3
				] = 255
		}

		/*
		* Región nueva.
		*/
		for (
			let i = 0;
			i < newComponent.length;
			i++
		) {

			const pixelIndex =
				newComponent[i]

			this.territoryIds[
				pixelIndex
			] = newTerritoryId

			const offset =
				pixelIndex * 4

			this.territoryImageData
				.data[
					offset
				] = color.r

			this.territoryImageData
				.data[
					offset + 1
				] = color.g

			this.territoryImageData
				.data[
					offset + 2
				] = color.b

			this.territoryImageData
				.data[
					offset + 3
				] = 255
		}


		/*
		* Actualizamos las regiones
		* almacenadas.
		*/
		this.territoryPixels.set(
			territoryId,
			originalComponent
		)

		this.territoryPixels.set(
			newTerritoryId,
			newComponent
		)

		/*
		* Metadata del nuevo territorio.
		*/
		this.territories.set(
			newTerritoryId,
			{
				id:
					newTerritoryId,

				name:
					`Territorio ${newTerritoryId}`,
			}
		)

		/*
		* Solo actualizamos Canvas una vez.
		*/
		this.context.putImageData(
			this.territoryImageData,
			0,
			0
		)

		return {
			status:
				'split',

			originalTerritoryId:
				territoryId,

			newTerritoryId,
		}
	}


	// --------------------------------------------------
	// ENCONTRAR COMPONENTES DE UN TERRITORIO
	// --------------------------------------------------
	private findTerritoryComponents(
		territoryId: number,
		territoryPixels: Int32Array,
		borderPixels: Uint8ClampedArray
	): Int32Array[] {

		const visited =
			new Uint8Array(
				MAP_WIDTH *
				MAP_HEIGHT
			)

		const queue =
			new Int32Array(
				territoryPixels.length
			)

		const components:
			Int32Array[] = []

		const isBorder =
			(
				pixelIndex: number
			) => {

				return (
					borderPixels[
						pixelIndex * 4 + 3
					] > 10
				)
			}

		const tryVisit =
			(
				pixelIndex: number,
				queueEnd: number
			): number => {

				if (
					pixelIndex < 0 ||
					pixelIndex >=
						this.territoryIds.length
				) {
					return queueEnd
				}

				if (
					visited[
						pixelIndex
					] !== 0
				) {
					return queueEnd
				}

				if (
					this.territoryIds[
						pixelIndex
					] !== territoryId
				) {
					return queueEnd
				}

				if (
					isBorder(
						pixelIndex
					)
				) {
					return queueEnd
				}

				visited[
					pixelIndex
				] = 1

				queue[
					queueEnd
				] = pixelIndex

				return (
					queueEnd + 1
				)
			}

		for (
			let i = 0;
			i < territoryPixels.length;
			i++
		) {

			const startPixel =
				territoryPixels[i]

			if (
				visited[
					startPixel
				] !== 0
			) {
				continue
			}

			if (
				isBorder(
					startPixel
				)
			) {
				continue
			}

			let queueStart =
				0

			let queueEnd =
				0

			visited[
				startPixel
			] = 1

			queue[
				queueEnd++
			] = startPixel

			const component:
				number[] = []

			while (
				queueStart <
				queueEnd
			) {

				const pixelIndex =
					queue[
						queueStart++
					]

				component.push(
					pixelIndex
				)

				const x =
					pixelIndex %
					MAP_WIDTH

				const y =
					Math.floor(
						pixelIndex /
						MAP_WIDTH
					)

				if (
					x > 0
				) {

					queueEnd =
						tryVisit(
							pixelIndex - 1,
							queueEnd
						)
				}

				if (
					x <
					MAP_WIDTH - 1
				) {

					queueEnd =
						tryVisit(
							pixelIndex + 1,
							queueEnd
						)
				}

				if (
					y > 0
				) {

					queueEnd =
						tryVisit(
							pixelIndex -
								MAP_WIDTH,
							queueEnd
						)
				}

				if (
					y <
					MAP_HEIGHT - 1
				) {

					queueEnd =
						tryVisit(
							pixelIndex +
								MAP_WIDTH,
							queueEnd
						)
				}
			}

			if (
				component.length > 0
			) {

				components.push(
					Int32Array.from(
						component
					)
				)
			}
		}

		return components
	}
}


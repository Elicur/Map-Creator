import {
    MAP_WIDTH,
    MAP_HEIGHT,
} from '../config/mapConfig'

import type {
    Country,
    Territory,
} from '../types/editor'

import type {
    MapProject,
    TerritoryControlState,
} from './projectTypes'

import {
    DrawingController,
} from '../editor/DrawingController'

import {
    TerritoryManager,
} from '../map/TerritoryManager'

import {
    CountryManager,
} from '../map/CountryManager'

import {
    TerritoryControlManager,
} from '../map/TerritoryControlManager'

import {
    hexToRgb,
} from '../map/colors'


export class ProjectManager {

    private drawing: DrawingController

    private territoryManager:
        TerritoryManager

    private countryManager:
        CountryManager

    private territoryControlManager:
        TerritoryControlManager


    constructor(
        drawing: DrawingController,
        territoryManager: TerritoryManager,
        countryManager: CountryManager,
        territoryControlManager: TerritoryControlManager
    ) {
        this.drawing =
            drawing

        this.territoryManager =
            territoryManager

        this.countryManager =
            countryManager

        this.territoryControlManager =
            territoryControlManager
    }


    // --------------------------------------------------
    // EXPORTAR
    // --------------------------------------------------

    public exportToJson(
        geographyLocked: boolean,
        projectName: string
    ): string {

        const project: MapProject = {
            format: 'map-creator',
            version: 1,

            name:
                projectName,

            mapWidth:
                MAP_WIDTH,

            mapHeight:
                MAP_HEIGHT,

            geographyLocked,

            borderImage:
                this.drawing.exportImage(),

            territories:
                this.territoryManager.getAll(),

            territoryRasterRle:
                encodeRle(
                    this.territoryManager
                        .getTerritoryIdsCopy()
                ),

            countries:
                this.countryManager
                    .getAll()
                    .map(
                        country => ({
                            ...country,
                        })
                    ),

            territoryControl:
                this.territoryControlManager
                    .getAllAssignments(),
        }


        return JSON.stringify(
            project,
            null,
            4
        )
    }


    // --------------------------------------------------
    // IMPORTAR
    // --------------------------------------------------

    public async importFromJson(
        json: string
    ): Promise<{
        geographyLocked: boolean
        name: string
    }> {

        const project =
            parseProject(
                json
            )


        const territoryIds =
            decodeRle(
                project.territoryRasterRle,
                MAP_WIDTH * MAP_HEIGHT
            )


        /*
         * Validamos las referencias antes
         * de modificar el proyecto actual.
         */
        validateReferences(
            project
        )


        /*
         * La imagen se carga antes de empezar
         * a modificar managers. Si está dañada,
         * el proyecto actual sigue intacto.
         */
        await this.drawing.importImage(
            project.borderImage
        )


        // -----------------------------
        // TERRITORIOS
        // -----------------------------

        this.territoryManager.loadState(
            project.territories,
            territoryIds
        )


        // -----------------------------
        // PAÍSES
        // -----------------------------

        this.countryManager.reset()


        for (
            const country of
            project.countries
        ) {

            this.countryManager.recreate(
                country.id,
                country.name,
                country.color
            )
        }


        // -----------------------------
        // CONTROL POLÍTICO
        // -----------------------------

        this.territoryControlManager.reset()


        for (
            const control of
            project.territoryControl
        ) {

            this.territoryControlManager.assign(
                control.territoryId,
                control.countryId
            )


            this.applyCountryColor(
                control
            )
        }


        return {
            geographyLocked:
                project.geographyLocked,
            name:
                project.name
        }
    }


    // --------------------------------------------------
    // COLOR POLÍTICO
    // --------------------------------------------------

    private applyCountryColor(
        control: TerritoryControlState
    ) {

        const country =
            this.countryManager.getById(
                control.countryId
            )


        if (country === null) {
            return
        }


        const color =
            hexToRgb(
                country.color
            )


        if (color === null) {
            return
        }


        this.territoryManager.setColor(
            control.territoryId,
            color
        )
    }
}


// ==================================================
// RLE
// ==================================================

function encodeRle(
    data: Uint32Array
): number[] {

    if (data.length === 0) {
        return []
    }


    const result: number[] =
        []


    let currentValue =
        data[0]

    let count =
        1


    for (
        let i = 1;
        i < data.length;
        i++
    ) {

        const value =
            data[i]


        if (
            value === currentValue
        ) {

            count++

            continue
        }


        result.push(
            currentValue,
            count
        )


        currentValue =
            value

        count =
            1
    }


    result.push(
        currentValue,
        count
    )


    return result
}


function decodeRle(
    data: number[],
    expectedLength: number
): Uint32Array {

    if (
        data.length % 2 !== 0
    ) {
        throw new Error(
            'Datos RLE inválidos'
        )
    }


    const result =
        new Uint32Array(
            expectedLength
        )


    let position =
        0


    for (
        let i = 0;
        i < data.length;
        i += 2
    ) {

        const value =
            data[i]

        const count =
            data[i + 1]


        if (
            !Number.isInteger(value) ||
            value < 0 ||
            !Number.isInteger(count) ||
            count <= 0
        ) {
            throw new Error(
                'Datos RLE inválidos'
            )
        }


        if (
            position + count >
            expectedLength
        ) {
            throw new Error(
                'El raster excede el tamaño esperado'
            )
        }


        result.fill(
            value,
            position,
            position + count
        )


        position +=
            count
    }


    if (
        position !== expectedLength
    ) {
        throw new Error(
            'El raster tiene un tamaño incorrecto'
        )
    }


    return result
}


// ==================================================
// PARSEAR PROYECTO
// ==================================================

function parseProject(
    json: string
): MapProject {

    const value: unknown =
        JSON.parse(
            json
        )

    if (
        typeof value !== 'object' ||
        value === null
    ) {
        throw new Error(
            'El archivo no contiene un proyecto válido'
        )
    }

    const project =
        value as Partial<MapProject>

    if (
        project.format !==
        'map-creator'
    ) {
        throw new Error(
            'El archivo no pertenece a Map Creator'
        )
    }

    if (
        project.version !== 1
    ) {
        throw new Error(
            `Versión de proyecto no soportada: ${project.version}`
        )
    }

    if (
        typeof project.name !== 'string' ||
        project.name.trim().length === 0
    ) {

        project.name =
            'Mapa importado'
    }

    if (
        project.mapWidth !==
            MAP_WIDTH ||
        project.mapHeight !==
            MAP_HEIGHT
    ) {
        throw new Error(
            'Las dimensiones del mapa no son compatibles'
        )
    }

    if (
        typeof project.geographyLocked !==
        'boolean'
    ) {
        throw new Error(
            'Estado de geografía inválido'
        )
    }

    if (
        typeof project.borderImage !==
        'string'
    ) {
        throw new Error(
            'Imagen de fronteras inválida'
        )
    }

    if (
        !Array.isArray(
            project.territories
        ) ||
        !Array.isArray(
            project.territoryRasterRle
        ) ||
        !Array.isArray(
            project.countries
        ) ||
        !Array.isArray(
            project.territoryControl
        )
    ) {
        throw new Error(
            'El proyecto está incompleto'
        )
    }


    return project as MapProject
}


// ==================================================
// VALIDAR REFERENCIAS
// ==================================================

function validateReferences(
    project: MapProject
) {

    const territoryIds =
        new Set<number>()

    const countryIds =
        new Set<number>()


    for (
        const territory of
        project.territories
    ) {

        validateTerritory(
            territory
        )


        if (
            territoryIds.has(
                territory.id
            )
        ) {
            throw new Error(
                'Hay territorios con IDs duplicados'
            )
        }


        territoryIds.add(
            territory.id
        )
    }


    for (
        const country of
        project.countries
    ) {

        validateCountry(
            country
        )


        if (
            countryIds.has(
                country.id
            )
        ) {
            throw new Error(
                'Hay países con IDs duplicados'
            )
        }


        countryIds.add(
            country.id
        )
    }


    for (
        const control of
        project.territoryControl
    ) {

        if (
            !territoryIds.has(
                control.territoryId
            )
        ) {
            throw new Error(
                `Asignación a territorio inexistente: ${control.territoryId}`
            )
        }


        if (
            !countryIds.has(
                control.countryId
            )
        ) {
            throw new Error(
                `Asignación a país inexistente: ${control.countryId}`
            )
        }
    }
}


function validateTerritory(
    territory: Territory
) {

    if (
        !Number.isInteger(
            territory.id
        ) ||
        territory.id <= 0 ||
        typeof territory.name !==
            'string'
    ) {
        throw new Error(
            'Territorio inválido'
        )
    }
}


function validateCountry(
    country: Country
) {

    if (
        !Number.isInteger(
            country.id
        ) ||
        country.id <= 0 ||
        typeof country.name !==
            'string' ||
        !/^#[0-9a-f]{6}$/i.test(
            country.color
        )
    ) {
        throw new Error(
            'País inválido'
        )
    }
}
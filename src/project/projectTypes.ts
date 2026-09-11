import type {
    Country,
    Territory,
} from '../types/editor'


export type TerritoryControlState = {
    territoryId: number
    countryId: number
}


export type MapProject = {
    format: 'map-creator'
    version: 1

    name: string

    mapWidth: number
    mapHeight: number

    geographyLocked: boolean

    borderImage: string

    territories: Territory[]
    territoryRasterRle: number[]

    countries: Country[]

    territoryControl: TerritoryControlState[]
}
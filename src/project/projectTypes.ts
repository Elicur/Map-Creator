import type {
    Country,
    Territory,
} from '../types/editor'

import type {
    TimelineProjectState,
} from '../timeline/timelineTypes'


export type TerritoryControlState = {
    territoryId: number
    countryId: number
}


export type MapProject = {
    format:
        'map-creator'

    version:
        2

    name:
        string

    mapWidth:
        number

    mapHeight:
        number

    geographyLocked:
        boolean

    nextTerritoryId:
        number

    borderImage:
        string

    referenceImage:
        string | null

    territories:
        Territory[]

    territoryRasterRle:
        number[]

    countries:
        Country[]

    territoryControl:
        TerritoryControlState[]

    timeline:
        TimelineProjectState | null
}
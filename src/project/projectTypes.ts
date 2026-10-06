import type {
    Country,
    Territory,
} from '../types/editor'

import type {
    TimelineProjectState,
} from '../timeline/timelineTypes'


type MapProjectBase = {
    format:
        'map-creator'

    name:
        string

    mapWidth:
        number

    mapHeight:
        number

    geographyLocked:
        boolean

    borderImage:
        string

    territories:
        Territory[]

    territoryRasterRle:
        number[]

    countries:
        Country[]

    territoryControl: 
        TerritoryControlState[]
}

export type TerritoryControlState = {
    territoryId: number
    countryId: number
}

export type MapProjectV1 =
    MapProjectBase & {
        version: 1
    }


export type MapProjectV2 =
    MapProjectBase & {
        version: 2

        timeline:
            TimelineProjectState | null
    }


export type MapProject =
    | MapProjectV1
    | MapProjectV2
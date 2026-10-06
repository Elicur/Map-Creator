export type TimelineDate = {
    year: number
    month: number
}


export type TimelineTerritoryControl = {
    territoryId: number
    countryId: number | null
}


export type TerritoryOwnerChangedEvent = {
    id: number

    type:
        'territory-owner-changed'

    date:
        TimelineDate

    territoryId:
        number

    countryId:
        number | null
}


export type TerritorySplitEvent = {
    id: number

    type:
        'territory-split'

    date:
        TimelineDate

    parentTerritoryId:
        number

    newTerritoryId:
        number
}


export type TimelineProjectState = {
    initialDate:
        TimelineDate

    initialTerritoryControl:
        TimelineTerritoryControl[]

    events:
        TimelineEvent[]

    nextEventId:
        number
}


export type TimelineEvent =
    | TerritoryOwnerChangedEvent
    | TerritorySplitEvent
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

    type: 'territory-owner-changed'

    date: TimelineDate

    territoryId: number

    countryId: number | null
}

export type TimelineEvent =
    | TerritoryOwnerChangedEvent
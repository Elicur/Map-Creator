export type DrawingTool =
  | 'pencil'
  | 'eraser'


export type Tool =
  | DrawingTool
  | 'territory'
  | 'select'
  | 'assign-country'


export type Point = {
	x: number
	y: number
}


export type StrokeCommand = {
	type: 'stroke'

	tool: DrawingTool

	brushSize: number

	points: Point[]
}


export type ClearCommand = {
  	type: 'clear'
}


export type CreateTerritoryCommand = {
	type: 'create-territory'

	territoryId: number

	seedX: number
	seedY: number
}


export type Territory = {
	id: number
	name: string
}


export type RGBColor = {
	r: number
	g: number
	b: number
}

export type RenameTerritoryCommand = {
    type: 'rename-territory'
    territoryId: number
    name: string
}

export type Country = {
    id: number
    name: string
    color: string
}


export type CreateCountryCommand = {
    type: 'create-country'
    countryId: number
    name: string
    color: string
}


export type UpdateCountryCommand = {
    type: 'update-country'
    countryId: number
    name: string
    color: string
}


export type DeleteCountryCommand = {
    type: 'delete-country'
    countryId: number
}


export type AssignTerritoryCountryCommand = {
    type: 'assign-territory-country'
    territoryId: number
    countryId: number | null
}

export type HistoryCommand =
  | StrokeCommand
  | ClearCommand
  | CreateTerritoryCommand
  | RenameTerritoryCommand
  | CreateCountryCommand
  | UpdateCountryCommand
  | DeleteCountryCommand
  | AssignTerritoryCountryCommand

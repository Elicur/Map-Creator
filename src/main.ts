import './style.css'

import {
    createUI,
} from './ui/createUI'

import {
    CameraController,
} from './editor/CameraController'

import {
    DrawingController,
} from './editor/DrawingController'

import {
    TerritoryManager,
} from './map/TerritoryManager'

import {
    TerritoryPreviewController
} from './map/TerritoryPreviewController'

import {
    CountryManager,
} from './map/CountryManager'

import {
    TerritoryControlManager,
} from './map/TerritoryControlManager'

import {
    HistoryManager,
} from './history/HistoryManager'

import {
    InputController,
} from './editor/InputController'

import {
    ProjectManager,
} from './project/ProjectManager'

import {
    LocalProjectStore,
} from './project/LocalProjectStore'

import {
    TimelineManager,
} from './timeline/TimelineManager'

import {
    TimelineController,
} from './timeline/TimelineController'

import {
    ProjectController,
} from './project/ProjectController'

import {
    PoliticsController,
} from './editor/PoliticsController'

// --------------------------------------------------
// INTERFAZ
// --------------------------------------------------

const ui =
    createUI()


// --------------------------------------------------
// COMPONENTES DEL EDITOR
// --------------------------------------------------

const camera =
    new CameraController(
        ui.workspace,
        ui.mapContainer,
        ui.zoomValue
    )


const drawing =
    new DrawingController(
        ui.borderCanvas
    )


const preview =
    new TerritoryPreviewController(
        ui.previewCanvas
    )


const territoryManager =
    new TerritoryManager(
        ui.territoryCanvas
    )


const historyManager =
    new HistoryManager()


const countryManager =
    new CountryManager()


const territoryControlManager =
    new TerritoryControlManager()


const timelineManager =
    new TimelineManager()

const timelineController =
    new TimelineController(
        ui,
        timelineManager,
        territoryManager,
        territoryControlManager
    )

const politicsController =
    new PoliticsController(
        ui,
        countryManager,
        territoryManager,
        territoryControlManager,
        preview,
        timelineController
    )

const projectManager =
    new ProjectManager(
        drawing,
        territoryManager,
        countryManager,
        territoryControlManager
    )

const localProjectStore =
    new LocalProjectStore()

const projectController =
    new ProjectController(
        ui,
        projectManager,
        localProjectStore,
        historyManager
    )

const input =
    new InputController(
        ui,
        camera,
        drawing,
        territoryManager,
        historyManager,
        preview,
        countryManager,
        territoryControlManager,
        projectController,
        timelineController,
        politicsController
    )


// --------------------------------------------------
// INICIALIZACIÓN
// --------------------------------------------------

territoryManager.reset()

drawing.clear()

input.start()

preview.clear()

requestAnimationFrame(
    () => {
        camera.centerView()
    }
)
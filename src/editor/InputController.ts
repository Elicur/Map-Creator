import type {
    DrawingTool,
    Tool,
    HistoryCommand,
    Point,
    StrokeCommand,
} from '../types/editor'

import type {
    EditorUI,
} from '../ui/createUI'

import {
    CameraController,
} from './CameraController'

import {
    DrawingController,
} from './DrawingController'

import {
    TerritoryManager,
} from '../map/TerritoryManager'

import {
    HistoryManager,
} from '../history/HistoryManager'

import {
    TerritoryPreviewController,
} from '../map/TerritoryPreviewController'

import {
    CountryManager,
} from '../map/CountryManager'

import {
    TerritoryControlManager,
} from '../map/TerritoryControlManager'

import {
    hexToRgb,
    TERRITORY_CREATION_PREVIEW_COLOR,
} from '../map/colors'

import {
    ProjectManager,
} from '../project/ProjectManager'

import {
    LocalProjectStore,
} from '../project/LocalProjectStore'

import type {
    LocalProjectRecord,
} from '../project/LocalProjectStore'


const LAST_LOCAL_PROJECT_KEY =
    'map-creator-last-project-id'

export class InputController {

    private ui: EditorUI

    private camera: CameraController
    private drawing: DrawingController
    private territoryManager: TerritoryManager
    private historyManager: HistoryManager

    private currentTool: Tool = 'pencil'

    private selectedCountryId: number | null = null

    private started = false

    private selectedTerritoryId: number | null = null

    private preview: TerritoryPreviewController

    private pendingPreviewPosition: Point | null = null

    private previewTimer: number | null = null

    private countryManager: CountryManager

    private territoryControlManager: TerritoryControlManager

    private geographyLocked = false

    private projectManager: ProjectManager

    private historyBaseProjectJson: string | null = null

    private rebuildingHistory = false

    private localProjectStore: LocalProjectStore

    private currentLocalProjectId: string | null = null

    private projectDirty = false

    private savedHistoryStateId = 0

    private savedGeographyLocked = false

    private savedProjectName = 'Mi mapa'

    private requiresLocalSave = false

    private splittingTerritoryId: number | null = null

    constructor(
        ui: EditorUI,
        camera: CameraController,
        drawing: DrawingController,
        territoryManager: TerritoryManager,
        historyManager: HistoryManager,
        preview: TerritoryPreviewController,
        countryManager: CountryManager,
        territoryControlManager: TerritoryControlManager,
        projectManager: ProjectManager,
        localProjectStore: LocalProjectStore
    ) {
        this.ui = ui
        this.camera = camera
        this.drawing = drawing
        this.territoryManager = territoryManager
        this.historyManager = historyManager
        this.preview = preview
        this.countryManager = countryManager
        this.territoryControlManager = territoryControlManager
        this.projectManager = projectManager
        this.localProjectStore = localProjectStore
    }


    // --------------------------------------------------
    // INICIAR INPUT
    // --------------------------------------------------

    public start() {

        if (this.started) {
            return
        }

        this.started = true


        // -----------------------------
        // HERRAMIENTAS
        // -----------------------------

        this.ui.pencilButton.addEventListener(
            'click',
            this.handlePencilClick
        )

        this.ui.eraserButton.addEventListener(
            'click',
            this.handleEraserClick
        )

        this.ui.territoryButton.addEventListener(
            'click',
            this.handleTerritoryClick
        )

        this.ui.selectButton.addEventListener(
            'click',
            this.handleSelectClick
        )


        // -----------------------------
        // TOOLBAR
        // -----------------------------

        this.ui.brushSizeInput.addEventListener(
            'input',
            this.handleBrushSizeInput
        )

        this.ui.clearButton.addEventListener(
            'click',
            this.handleClearClick
        )

        this.ui.geographyLockButton.addEventListener(
            'click',
            this.handleGeographyLockClick
        )

        this.ui.resetViewButton.addEventListener(
            'click',
            this.handleResetViewClick
        )

        this.ui.territorySaveButton.addEventListener(
            'click',
            this.handleTerritorySaveClick
        )

        this.ui.territoryDivideButton.addEventListener(
            'click',
            this.handleDivideTerritoryClick
        )

        this.ui.territoryDeleteButton.addEventListener(
            'click',
            this.handleDeleteTerritoryClick
        )

        this.ui.territoryCloseButton.addEventListener(
            'click',
            this.handleTerritoryCloseClick
        )

        this.ui.territoryNameInput.addEventListener(
            'keydown',
            this.handleTerritoryNameKeyDown
        )

        this.ui.countriesButton.addEventListener(
            'click',
            this.handleCountriesClick
        )

        this.ui.countryCloseButton.addEventListener(
            'click',
            this.handleCountryCloseClick
        )

        this.ui.createCountryButton.addEventListener(
            'click',
            this.handleCreateCountryClick
        )

        this.ui.territoryCountrySelect.addEventListener(
            'change',
            this.handleTerritoryCountryChange
        )

        // -----------------------------
        // WORKSPACE
        // -----------------------------

        this.ui.workspace.addEventListener(
            'pointerdown',
            this.handlePointerDown
        )

        this.ui.workspace.addEventListener(
            'pointermove',
            this.handlePointerMove
        )

        this.ui.workspace.addEventListener(
            'pointerup',
            this.handlePointerUp
        )

        this.ui.workspace.addEventListener(
            'pointercancel',
            this.handlePointerUp
        )

        this.ui.workspace.addEventListener(
            'wheel',
            this.handleWheel,
            {
                passive: false,
            }
        )

        this.ui.workspace.addEventListener(
            'auxclick',
            this.handleAuxClick
        )

        this.ui.workspace.addEventListener(
            'pointerleave',
            this.handlePointerLeave
        )


        // -----------------------------
        // DOCUMENTO
        // -----------------------------
        document.addEventListener(
            'pointerdown',
            this.handleDocumentPointerDown
        )


        // -----------------------------
        // TECLADO
        // -----------------------------

        window.addEventListener(
            'keydown',
            this.handleKeyDown
        )

        window.addEventListener(
            'keyup',
            this.handleKeyUp
        )

        window.addEventListener(
            'blur',
            this.handleWindowBlur
        )


        // ------------------------------
        // PAÍSES
        // -----------------------------
        this.ui.saveCountryButton.addEventListener(
            'click',
            this.handleSaveCountryClick
        )

        this.ui.assignCountryButton.addEventListener(
            'click',
            this.handleAssignCountryClick
        )

        this.ui.deleteCountryButton.addEventListener(
            'click',
            this.handleDeleteCountryClick
        )

        // ------------------------------
        // EXPORTAR / IMPORTAR MAPA
        // ------------------------------
        this.ui.exportMapButton.addEventListener(
            'click',
            this.handleExportMapClick
        )

        this.ui.importMapButton.addEventListener(
            'click',
            this.handleImportMapClick
        )

        this.ui.importMapInput.addEventListener(
            'change',
            this.handleImportMapChange
        )

        // ------------------------------
        // GUARDADO LOCAL
        // ------------------------------
        this.ui.saveLocalProjectButton.addEventListener(
            'click',
            this.handleSaveLocalProjectClick
        )

        this.ui.localProjectsButton.addEventListener(
            'click',
            this.handleLocalProjectsClick
        )

        this.ui.localProjectsCloseButton.addEventListener(
            'click',
            this.handleLocalProjectsCloseClick
        )

        // ------------------------------
        // PROYECTO
        // ------------------------------

        this.ui.projectNameInput.addEventListener(
            'input',
            this.handleProjectNameInput
        )

        this.ui.newProjectButton.addEventListener(
            'click',
            this.handleNewProjectClick
        )

        // -----------------------------
        // ANTES DE CERRAR VENTANA
        // -----------------------------
        window.addEventListener(
            'beforeunload',
            this.handleBeforeUnload
        )

        /*
         * Dejamos explícitamente sincronizada
         * la herramienta inicial con la UI.
         */
        this.setTool(
            'pencil'
        )

        this.updateGeographyLockUI()

        this.markCurrentStateAsSaved()

        void this.restoreLastLocalProject()
    }


    // --------------------------------------------------
    // DETENER INPUT
    // --------------------------------------------------

    public stop() {

        if (!this.started) {
            return
        }

        this.started = false


        // -----------------------------
        // HERRAMIENTAS
        // -----------------------------
        this.ui.pencilButton.removeEventListener(
            'click',
            this.handlePencilClick
        )

        this.ui.eraserButton.removeEventListener(
            'click',
            this.handleEraserClick
        )

        this.ui.territoryButton.removeEventListener(
            'click',
            this.handleTerritoryClick
        )

        this.ui.selectButton.removeEventListener(
            'click',
            this.handleSelectClick
        )


        // -----------------------------
        // TOOLBAR
        // -----------------------------
        this.ui.brushSizeInput.removeEventListener(
            'input',
            this.handleBrushSizeInput
        )

        this.ui.clearButton.removeEventListener(
            'click',
            this.handleClearClick
        )

        this.ui.geographyLockButton.removeEventListener(
            'click',
            this.handleGeographyLockClick
        )

        this.ui.resetViewButton.removeEventListener(
            'click',
            this.handleResetViewClick
        )

        this.ui.territorySaveButton.removeEventListener(
            'click',
            this.handleTerritorySaveClick
        )

        this.ui.territoryDivideButton.removeEventListener(
            'click',
            this.handleDivideTerritoryClick
        )

        this.ui.territoryDeleteButton.removeEventListener(
            'click',
            this.handleDeleteTerritoryClick
        )

        this.ui.territoryCloseButton.removeEventListener(
            'click',
            this.handleTerritoryCloseClick
        )

        this.ui.territoryNameInput.removeEventListener(
            'keydown',
            this.handleTerritoryNameKeyDown
        )

        this.ui.countriesButton.removeEventListener(
            'click',
            this.handleCountriesClick
        )

        this.ui.countryCloseButton.removeEventListener(
            'click',
            this.handleCountryCloseClick
        )

        this.ui.createCountryButton.removeEventListener(
            'click',
            this.handleCreateCountryClick
        )

        this.ui.territoryCountrySelect.removeEventListener(
            'change',
            this.handleTerritoryCountryChange
        )


        this.ui.workspace.removeEventListener(
            'pointerdown',
            this.handlePointerDown
        )

        this.ui.workspace.removeEventListener(
            'pointermove',
            this.handlePointerMove
        )

        this.ui.workspace.removeEventListener(
            'pointerup',
            this.handlePointerUp
        )

        this.ui.workspace.removeEventListener(
            'pointercancel',
            this.handlePointerUp
        )

        this.ui.workspace.removeEventListener(
            'wheel',
            this.handleWheel
        )

        this.ui.workspace.removeEventListener(
            'auxclick',
            this.handleAuxClick
        )

        this.ui.workspace.removeEventListener(
            'pointerleave',
            this.handlePointerLeave
        )


        //------------------------------
        // DOCUMENTO
        //------------------------------
        document.removeEventListener(
            'pointerdown',
            this.handleDocumentPointerDown
        )


        // -----------------------------
        // TECLADO
        // -----------------------------
        window.removeEventListener(
            'keydown',
            this.handleKeyDown
        )

        window.removeEventListener(
            'keyup',
            this.handleKeyUp
        )

        window.removeEventListener(
            'blur',
            this.handleWindowBlur
        )

        // -----------------------------
        // PAÍSES
        // -----------------------------
        this.ui.saveCountryButton.removeEventListener(
            'click',
            this.handleSaveCountryClick
        )

        this.ui.assignCountryButton.removeEventListener(
            'click',
            this.handleAssignCountryClick
        )

        this.ui.deleteCountryButton.removeEventListener(
            'click',
            this.handleDeleteCountryClick
        )

        // ------------------------------
        // EXPORTAR / IMPORTAR MAPA
        // ------------------------------
        this.ui.exportMapButton.removeEventListener(
            'click',
            this.handleExportMapClick
        )

        this.ui.importMapButton.removeEventListener(
            'click',
            this.handleImportMapClick
        )

        this.ui.importMapInput.removeEventListener(
            'change',
            this.handleImportMapChange
        )

        // ------------------------------
        // GUARDADO LOCAL
        // ------------------------------
        this.ui.saveLocalProjectButton.removeEventListener(
            'click',
            this.handleSaveLocalProjectClick
        )

        this.ui.localProjectsButton.removeEventListener(
            'click',
            this.handleLocalProjectsClick
        )

        this.ui.localProjectsCloseButton.removeEventListener(
            'click',
            this.handleLocalProjectsCloseClick
        )

        // ------------------------------
        // PROYECTO
        // ------------------------------
        this.ui.projectNameInput.removeEventListener(
            'input',
            this.handleProjectNameInput
        )

        this.ui.newProjectButton.removeEventListener(
            'click',
            this.handleNewProjectClick
        )

        // -----------------------------
        // ANTES DE CERRAR VENTANA
        // -----------------------------
        window.removeEventListener(
            'beforeunload',
            this.handleBeforeUnload
        )
    }


    // --------------------------------------------------
    // SELECCIONAR HERRAMIENTA
    // --------------------------------------------------

    private setTool(
        tool: Tool
    ) {

        const isGeographyTool =
            tool === 'pencil' ||
            tool === 'eraser' ||
            tool === 'territory' ||
            tool === 'divide-territory'

        if (
            this.geographyLocked &&
            isGeographyTool
        ) {

            this.ui.statusMessage.textContent =
                'La geografía está finalizada'

            return
        }

        const leavingCountryAssignment =
            this.currentTool === 'assign-country' &&
            tool !== 'assign-country'


        if (leavingCountryAssignment) {

            this.clearTerritoryPreview()
        }

        if (
            this.currentTool ===
                'divide-territory' &&
            tool !==
                'divide-territory'
        ) {

            this.splittingTerritoryId =
                null
        }

        this.currentTool = tool

        this.ui.pencilButton.classList.toggle(
            'active',
            tool === 'pencil'
        )

        this.ui.eraserButton.classList.toggle(
            'active',
            tool === 'eraser'
        )

        this.ui.territoryButton.classList.toggle(
            'active',
            tool === 'territory'
        )

        this.ui.selectButton.classList.toggle(
            'active',
            tool === 'select'
        )

        this.ui.workspace.classList.toggle(
            'territory-mode',
            tool === 'territory'
        )

        this.ui.workspace.classList.toggle(
            'divide-territory-mode',
            tool ===
                'divide-territory'
        )

        this.ui.workspace.classList.toggle(
            'select-mode',
            tool === 'select'
        )

        this.ui.workspace.classList.toggle(
            'assign-country-mode',
            tool === 'assign-country'
        )


        switch (tool) {

            case 'pencil':
                this.ui.statusMessage.textContent =
                    'Herramienta: Lápiz'
                break

            case 'eraser':
                this.ui.statusMessage.textContent =
                    'Herramienta: Borrador'
                break

            case 'territory':
                this.ui.statusMessage.textContent =
                    'Herramienta: Crear territorio'
                break

            case 'select':
                this.ui.statusMessage.textContent =
                    'Herramienta: Seleccionar'
                break
            
            case 'assign-country': {

                if (
                    this.selectedCountryId === null
                ) {

                    this.ui.statusMessage.textContent =
                        'Seleccioná un país para asignar territorios'

                    break
                }

                const country =
                    this.countryManager.getById(
                        this.selectedCountryId
                    )

                if (country === null) {

                    this.ui.statusMessage.textContent =
                        'Seleccioná un país para asignar territorios'

                    break
                }

                this.ui.statusMessage.textContent =
                    `Asignando territorios a: ${country.name}`

                break
            }
        }
    
        if (leavingCountryAssignment) {

            this.refreshCountryUI()
        }

        this.showSelectedCountry()
    }


    // --------------------------------------------------
    // BOTONES DE HERRAMIENTAS
    // --------------------------------------------------

    private handlePencilClick =
        () => {

            this.setTool(
                'pencil'
            )
        }


    private handleEraserClick =
        () => {

            this.setTool(
                'eraser'
            )
        }


    private handleTerritoryClick =
        () => {

            this.setTool(
                'territory'
            )
        }


    private handleSelectClick =
        () => {

            this.setTool(
                'select'
            )
        }

    private handlePointerLeave =
        () => {

            if (
                this.camera.isPanning ||
                this.drawing.isDrawing
            ) {
                return
            }


            this.clearTerritoryPreview()
        }

    private handleCountriesClick =
        () => {

            const isOpen =
                !this.ui.countryPanel.classList.contains(
                    'hidden'
                )

            if (isOpen) {

                this.closeCountryPanel()

                return
            }

            this.refreshCountryUI()

            this.ui.countryPanel.classList.remove(
                'hidden'
            )
        }

    private handleCountryCloseClick =
        () => {

            this.closeCountryPanel()
        }

    // --------------------------------------------------
    // GROSOR
    // --------------------------------------------------

    private handleBrushSizeInput =
        () => {

            this.ui.brushSizeValue.textContent =
                this.ui.brushSizeInput.value
        }


    // --------------------------------------------------
    // LIMPIAR
    // --------------------------------------------------

    private handleClearClick =
        () => {

            // Si la geografía está bloqueada, no permitimos limpiar el mapa.
            if (this.geographyLocked) {
                this.ui.statusMessage.textContent =
                    'La geografía está finalizada'
                return
            }

            this.commitHistory({
                type: 'clear',
            })

            this.drawing.clear()
            this.territoryManager.reset()
            this.territoryControlManager.reset()
            this.clearTerritorySelection()
            this.clearTerritoryPreview()
            this.refreshCountryUI()

            this.ui.statusMessage.textContent =
                'Mapa limpiado'
        }


    // --------------------------------------------------
    // CENTRAR VISTA
    // --------------------------------------------------

    private handleResetViewClick =
        () => {

            this.camera.resetView()
        }


    // --------------------------------------------------
    // POINTER DOWN
    // --------------------------------------------------

    private handlePointerDown =
        (event: PointerEvent) => {

            const wantsToPan =
                (
                    event.button === 0 &&
                    event.ctrlKey
                )
                ||
                event.button === 1


            // -----------------------------
            // PAN
            // -----------------------------

            if (wantsToPan) {

                this.clearTerritoryPreview()
                this.drawing.cancelStroke()

                this.camera.startPan(
                    event
                )


                this.ui.workspace.classList.add(
                    'is-panning'
                )


                this.ui.workspace.setPointerCapture(
                    event.pointerId
                )


                event.preventDefault()

                return
            }


            /*
             * El resto de las herramientas
             * solamente usan click izquierdo.
             */
            if (event.button !== 0) {
                return
            }


            /*
             * Debemos haber hecho click
             * sobre el canvas superior.
             */
            if (
                event.target !==
                this.ui.borderCanvas
            ) {
                return
            }


            const position =
                this.camera.getMapPosition(
                    event
                )


            if (
                !this.camera.isInsideMap(
                    position.x,
                    position.y
                )
            ) {
                return
            }


            // -----------------------------
            // CREAR TERRITORIO
            // -----------------------------

            if (
                this.currentTool ===
                'territory'
            ) {

                this.createTerritory(
                    position.x,
                    position.y
                )

                return
            }


            // -----------------------------
            // SELECCIONAR TERRITORIO
            // -----------------------------

            if (
                this.currentTool ===
                'select'
            ) {

                this.selectTerritory(
                    position.x,
                    position.y
                )

                return
            }


            // -----------------------------
            // ASIGNAR PAÍS
            // -----------------------------

            if (
                this.currentTool ===
                'assign-country'
            ) {

                this.assignSelectedCountryAt(
                    position.x,
                    position.y
                )

                return
            }

            // -----------------------------
            // DIVIDIR TERRITORIO
            // -----------------------------

            if (
                this.currentTool ===
                    'divide-territory'
            ) {

                if (
                    this.splittingTerritoryId ===
                        null
                ) {

                    this.setTool(
                        'select'
                    )

                    return
                }

                const brushSize =
                    Number(
                        this.ui.brushSizeInput.value
                    )

                /*
                * La línea de división siempre
                * es una frontera nueva.
                */
                this.drawing.startStroke(
                    position.x,
                    position.y,
                    'pencil',
                    brushSize
                )

                this.ui.workspace.setPointerCapture(
                    event.pointerId
                )

                return
            }

            // -----------------------------
            // DIBUJAR
            // -----------------------------

            const brushSize =
                Number(
                    this.ui.brushSizeInput.value
                )


            /*
             * Como territory y select ya
             * terminaron con return, TypeScript
             * sabe que aquí solo queda:
             *
             * pencil | eraser
             */
            const drawingTool: DrawingTool =
                this.currentTool


            this.drawing.startStroke(
                position.x,
                position.y,
                drawingTool,
                brushSize
            )


            this.ui.workspace.setPointerCapture(
                event.pointerId
            )
        }


    // --------------------------------------------------
    // POINTER MOVE
    // --------------------------------------------------

    private handlePointerMove =
        (event: PointerEvent) => {

            // -----------------------------
            // PAN
            // -----------------------------

            if (
                this.camera.isPanning
            ) {

                this.camera.updatePan(
                    event
                )

                return
            }


            const position =
                this.camera.getMapPosition(
                    event
                )


            // -----------------------------
            // PREVIEW DE TERRITORIO
            // -----------------------------

            if (
                this.currentTool ===
                'territory'
            ) {

                if (
                    !this.camera.isInsideMap(
                        position.x,
                        position.y
                    )
                ) {

                    this.clearTerritoryPreview()

                    return
                }


                this.scheduleTerritoryPreview(
                    position.x,
                    position.y
                )

                return
            }


            // -----------------------------
            // PREVIEW ASIGNAR PAÍS
            // -----------------------------

            if (
                this.currentTool ===
                'assign-country'
            ) {

                if (
                    !this.camera.isInsideMap(
                        position.x,
                        position.y
                    )
                ) {

                    this.clearTerritoryPreview()

                    return
                }


                this.scheduleCountryAssignmentPreview(
                    position.x,
                    position.y
                )

                return
            }


            // -----------------------------
            // DIBUJO
            // -----------------------------

            if (
                this.drawing.isDrawing
            ) {

                this.drawing.continueStroke(
                    position.x,
                    position.y
                )
            }
        }


    // --------------------------------------------------
    // POINTER UP
    // --------------------------------------------------

    private handlePointerUp =
        (event: PointerEvent) => {

            const completedStroke =
                this.drawing.endStroke()

            if (
                completedStroke !== null
            ) {

                /*
                * Si estamos dividiendo un territorio,
                * este trazo NO debe guardarse como
                * un stroke normal.
                *
                * finishTerritorySplit() se encargará
                * de validar la división y guardar un
                * SplitTerritoryCommand.
                */
                if (
                    this.currentTool ===
                    'divide-territory'
                ) {

                    void this.finishTerritorySplit(
                        completedStroke
                    )
                }

                else {

                    /*
                    * Lápiz / goma normales.
                    */
                    this.commitHistory(
                        completedStroke
                    )
                }
            }

            /*
            * Este bloque se mantiene igual
            * independientemente de la herramienta.
            */
            this.camera.stopPan()

            this.ui.workspace.classList.remove(
                'is-panning'
            )

            if (
                this.ui.workspace.hasPointerCapture(
                    event.pointerId
                )
            ) {

                this.ui.workspace.releasePointerCapture(
                    event.pointerId
                )
            }
        }


    // --------------------------------------------------
    // CREAR TERRITORIO
    // --------------------------------------------------

    private createTerritory(
        x: number,
        y: number
    ) {

        this.clearTerritoryPreview()

        const result =
            this.territoryManager.createAt(
                x,
                y,
                this.drawing.getPixels()
            )


        if (
            result.status === 'created'
        ) {

            this.commitHistory({
                type: 'create-territory',

                territoryId:
                    result.territory.id,

                seedX:
                    result.seedX,

                seedY:
                    result.seedY,
            })


            this.ui.statusMessage.textContent =
                `Territorio #${result.territory.id} creado`

            return
        }


        if (
            result.status === 'existing'
        ) {

            this.ui.statusMessage.textContent =
                `${result.territory.name} (#${result.territory.id})`

            return
        }


        if (
            result.status === 'not-closed'
        ) {

            this.ui.statusMessage.textContent =
                '⚠ La región no está cerrada'

            return
        }


        this.ui.statusMessage.textContent =
            'No se pudo crear el territorio'
    }


    // --------------------------------------------------
    // DIVIDIR TERRITORIO
    // --------------------------------------------------

    private handleDivideTerritoryClick =
        () => {

            if (
                this.geographyLocked
            ) {

                this.ui.statusMessage.textContent =
                    'Reabrí la geografía para dividir territorios'

                return
            }

            if (
                this.selectedTerritoryId ===
                null
            ) {
                return
            }

            const territory =
                this.territoryManager.getById(
                    this.selectedTerritoryId
                )

            if (
                territory === null
            ) {
                return
            }

            this.splittingTerritoryId =
                territory.id

            this.setTool(
                'divide-territory'
            )

            this.ui.territoryPanel.classList.add(
                'hidden'
            )

            this.clearTerritoryPreview()

            this.ui.statusMessage.textContent =
                `Dividiendo "${territory.name}": dibujá una línea de borde a borde`
        }

 
    // --------------------------------------------------
    // TERMINAR DIVISIÓN DE TERRITORIO
    // --------------------------------------------------
    private async finishTerritorySplit(
        stroke: StrokeCommand
    ) {

        const territoryId =
            this.splittingTerritoryId


        if (
            territoryId === null
        ) {
            return
        }


        const borderPixels =
            this.drawing.getPixels()


        const result =
            this.territoryManager.split(
                territoryId,
                borderPixels
            )


        // --------------------------------
        // DIVISIÓN INVÁLIDA
        // --------------------------------

        if (
            result.status !==
            'split'
        ) {

            /*
            * El trazo todavía no fue agregado
            * al historial.
            *
            * Reconstruir desde history elimina
            * automáticamente la línea inválida.
            */
            this.rebuildingHistory =
                true


            try {

                await this.redrawHistory()
            }

            finally {

                this.rebuildingHistory =
                    false
            }


            if (
                result.status ===
                'not-divided'
            ) {

                this.ui.statusMessage.textContent =
                    'La línea no divide completamente el territorio. Dibujala de borde a borde.'
            }

            else if (
                result.status ===
                'too-many-parts'
            ) {

                this.ui.statusMessage.textContent =
                    'La línea genera más de dos regiones. Intentá una división más simple.'
            }

            else {

                this.ui.statusMessage.textContent =
                    'No se pudo dividir el territorio'
            }


            /*
            * Seguimos en modo división para
            * que pueda intentarlo otra vez.
            */
            return
        }


        // --------------------------------
        // HEREDAR PAÍS
        // --------------------------------

        const countryId =
            this.territoryControlManager
                .getCountryId(
                    territoryId
                )


        if (
            countryId !== null
        ) {

            this.territoryControlManager.assign(
                result.newTerritoryId,
                countryId
            )
        }


        // --------------------------------
        // HISTORY
        // --------------------------------

        this.commitHistory({
            type:
                'split-territory',

            territoryId,

            newTerritoryId:
                result.newTerritoryId,

            stroke,
        })


        // --------------------------------
        // SALIR DEL MODO DIVISIÓN
        // --------------------------------

        this.splittingTerritoryId =
            null


        this.clearTerritorySelection()


        this.setTool(
            'select'
        )


        this.ui.statusMessage.textContent =
            `Territorio dividido: se creó Territorio ${result.newTerritoryId}`
    }


    // --------------------------------------------------
    // SELECCIONAR TERRITORIO
    // --------------------------------------------------

    private selectTerritory(
        x: number,
        y: number
    ) {

        const territory =
            this.territoryManager.getAt(
                x,
                y
            )

        if (territory === null) {

            this.clearTerritorySelection()

            this.ui.statusMessage.textContent =
                'No hay ningún territorio aquí'

            return
        }

        this.selectedTerritoryId =
            territory.id

        this.showSelectedTerritory()

        this.ui.statusMessage.textContent =
            `${territory.name} (#${territory.id})`
    }


    // --------------------------------------------------
    // MOSTRAR TERRITORIO SELECCIONADO
    // --------------------------------------------------

    private showSelectedTerritory() {

        if (
            this.selectedTerritoryId === null
        ) {
            this.clearTerritorySelection()
            return
        }

        const territory =
            this.territoryManager.getById(
                this.selectedTerritoryId
            )

        if (territory === null) {

            this.clearTerritorySelection()
            return
        }

        this.ui.territoryIdValue.textContent =
            territory.id.toString()

        this.ui.territoryNameInput.value =
            territory.name

        this.ui.territoryPanel.classList.remove(
            'hidden'
        )

        this.refreshTerritoryCountrySelect()
    }


    // --------------------------------------------------
    // LIMPIAR SELECCIÓN
    // --------------------------------------------------

    private clearTerritorySelection() {

        this.selectedTerritoryId =
            null

        this.ui.territoryPanel.classList.add(
            'hidden'
        )

        this.ui.territoryIdValue.textContent =
            '-'

        this.ui.territoryNameInput.value =
            ''
    }

    // --------------------------------------------------
    // GUARDAR NOMBRE
    // --------------------------------------------------

    private saveTerritoryName() {

        if (
            this.selectedTerritoryId === null
        ) {
            return
        }

        const territory =
            this.territoryManager.getById(
                this.selectedTerritoryId
            )

        if (territory === null) {

            this.clearTerritorySelection()
            return
        }

        const newName =
            this.ui.territoryNameInput.value.trim()

        if (newName.length === 0) {

            this.ui.statusMessage.textContent =
                'El territorio debe tener un nombre'

            this.ui.territoryNameInput.value =
                territory.name

            return
        }

        /*
        * No agregamos una acción al historial
        * si el nombre realmente no cambió.
        */
        if (
            newName === territory.name
        ) {
            return
        }

        const renamed =
            this.territoryManager.rename(
                territory.id,
                newName
            )

        if (renamed === null) {
            return
        }

        this.commitHistory({
            type: 'rename-territory',
            territoryId: territory.id,
            name: newName,
        })

        this.ui.statusMessage.textContent =
            `Territorio #${territory.id} renombrado a "${newName}"`

        this.showSelectedTerritory()
    }

    // --------------------------------------------------
    private handleTerritorySaveClick =
        () => {

            this.saveTerritoryName()
        }


    private handleTerritoryCloseClick =
        () => {

            this.clearTerritorySelection()
        }


    private handleTerritoryNameKeyDown =
        (event: KeyboardEvent) => {

            if (
                event.key === 'Enter'
            ) {

                event.preventDefault()

                this.saveTerritoryName()
            }
        }

    
    // --------------------------------------------------
    // ELIMINAR TERRITORIO
    // --------------------------------------------------
    private handleDeleteTerritoryClick =
        () => {

            if (
                this.geographyLocked
            ) {

                this.ui.statusMessage.textContent =
                    'Reabrí la geografía para eliminar territorios'

                return
            }

            if (
                this.selectedTerritoryId ===
                null
            ) {
                return
            }

            const territory =
                this.territoryManager.getById(
                    this.selectedTerritoryId
                )

            if (territory === null) {
                return
            }

            const shouldDelete =
                window.confirm(
                    `¿Eliminar el territorio "${territory.name}"?`
                )

            if (!shouldDelete) {
                return
            }

            const territoryId =
                territory.id

            const deletedTerritory =
                this.territoryManager.delete(
                    territoryId
                )

            if (
                deletedTerritory === null
            ) {
                return
            }

            /*
            * El territorio deja de poder
            * pertenecer a un país.
            */
            this.territoryControlManager.assign(
                territoryId,
                null
            )

            /*
            * Registrar en Undo / Redo.
            *
            * Usamos commitHistory y no
            * historyManager.push para que
            * también se actualice:
            *
            * ● Sin guardar
            */
            this.commitHistory({
                type:
                    'delete-territory',

                territoryId,
            })


            this.clearTerritoryPreview()

            this.clearTerritorySelection()

            this.ui.statusMessage.textContent =
                `Territorio "${deletedTerritory.name}" eliminado`
        }
    
        
    // --------------------------------------------------
    // CREAR PAÍS
    // --------------------------------------------------
    private handleCreateCountryClick =
        () => {

            const country =
                this.countryManager.create(
                    this.ui.countryNameInput.value,
                    this.ui.countryColorInput.value
                )


            if (country === null) {

                this.ui.statusMessage.textContent =
                    'El país debe tener un nombre'

                return
            }


            this.commitHistory({
                type: 'create-country',
                countryId: country.id,
                name: country.name,
                color: country.color,
            })


            /*
            * El país recién creado pasa
            * a ser el país activo para asignar.
            */
            this.selectedCountryId =
                country.id


            this.ui.countryNameInput.value =
                ''


            this.refreshCountryUI()


            /*
            * Entramos automáticamente
            * en modo de asignación.
            */
            this.setTool(
                'assign-country'
            )


            this.ui.statusMessage.textContent =
                `País "${country.name}" creado. Click en territorios para asignarlos.`
        }
    
    
    private refreshCountryUI() {

        /*
        * El país seleccionado pudo desaparecer
        * debido a Undo.
        */
        if (
            this.selectedCountryId !== null &&
            this.countryManager.getById(
                this.selectedCountryId
            ) === null
        ) {

            this.selectedCountryId =
                null


            if (
                this.currentTool ===
                'assign-country'
            ) {

                this.setTool(
                    'select'
                )
            }
        }


        this.ui.countryList.replaceChildren()


        const countries =
            this.countryManager.getAll()


        for (
            const country of countries
        ) {

            const item =
                document.createElement(
                    'button'
                )


            item.type =
                'button'


            item.className =
                'country-list-item'


            if (
                country.id ===
                this.selectedCountryId
            ) {

                item.classList.add(
                    'selected'
                )
            }


            const color =
                document.createElement(
                    'span'
                )


            color.className =
                'country-color'


            color.style.backgroundColor =
                country.color


            const name =
                document.createElement(
                    'span'
                )


            name.textContent =
                country.name


            item.append(
                color,
                name
            )


            item.addEventListener(
                'click',
                () => {

                    this.selectCountry(
                        country.id
                    )
                }
            )


            this.ui.countryList.append(
                item
            )
        }


        this.refreshTerritoryCountrySelect()
    }

    private refreshTerritoryCountrySelect() {

        const select =
            this.ui.territoryCountrySelect


        select.replaceChildren()


        const noCountry =
            document.createElement(
                'option'
            )


        noCountry.value = ''

        noCountry.textContent =
            'Sin país'


        select.append(
            noCountry
        )


        for (
            const country of
            this.countryManager.getAll()
        ) {

            const option =
                document.createElement(
                    'option'
                )


            option.value =
                country.id.toString()


            option.textContent =
                country.name


            select.append(
                option
            )
        }


        if (
            this.selectedTerritoryId === null
        ) {
            select.value = ''
            return
        }


        const countryId =
            this.territoryControlManager.getCountryId(
                this.selectedTerritoryId
            )


        select.value =
            countryId === null
                ? ''
                : countryId.toString()
    }

    private handleTerritoryCountryChange =
        () => {

            if (
                this.selectedTerritoryId === null
            ) {
                return
            }


            const value =
                this.ui.territoryCountrySelect.value


            const countryId =
                value === ''
                    ? null
                    : Number(value)


            this.territoryControlManager.assign(
                this.selectedTerritoryId,
                countryId
            )


            this.applyTerritoryCountryColor(
                this.selectedTerritoryId,
                countryId
            )


            this.commitHistory({
                type: 'assign-territory-country',
                territoryId:
                    this.selectedTerritoryId,
                countryId,
            })


            if (countryId === null) {

                this.ui.statusMessage.textContent =
                    'Territorio sin país'

                return
            }


            const country =
                this.countryManager.getById(
                    countryId
                )


            if (country !== null) {

                this.ui.statusMessage.textContent =
                    `Territorio asignado a "${country.name}"`
            }
        }
    
    
    // --------------------------------------------------
    // SELECCIONAR PAÍS
    // --------------------------------------------------

    private selectCountry(
        countryId: number
    ) {

        const country =
            this.countryManager.getById(
                countryId
            )


        if (country === null) {
            return
        }


        /*
        * Si estábamos asignando otro país,
        * dejamos ese modo.
        */
        if (
            this.currentTool ===
            'assign-country'
        ) {

            this.setTool(
                'select'
            )
        }


        this.selectedCountryId =
            country.id


        this.refreshCountryUI()

        this.showSelectedCountry()


        this.ui.statusMessage.textContent =
            `País seleccionado: ${country.name}`
    }


    // --------------------------------------------------
    // MOSTRAR PAÍS SELECCIONADO
    // --------------------------------------------------

    private showSelectedCountry() {

        if (
            this.selectedCountryId === null
        ) {

            this.ui.selectedCountryEditor.classList.add(
                'hidden'
            )

            return
        }


        const country =
            this.countryManager.getById(
                this.selectedCountryId
            )


        if (country === null) {

            this.selectedCountryId =
                null

            this.ui.selectedCountryEditor.classList.add(
                'hidden'
            )

            return
        }


        this.ui.selectedCountryNameInput.value =
            country.name


        this.ui.selectedCountryColorInput.value =
            country.color


        this.ui.selectedCountryEditor.classList.remove(
            'hidden'
        )


        this.ui.assignCountryButton.textContent =
            this.currentTool === 'assign-country'
                ? 'Finalizar asignación'
                : 'Asignar territorios'
    }

    
    // --------------------------------------------------
    // ASIGNAR COLOR DE PAÍS A TERRITORIO
    // --------------------------------------------------
    
    private applyTerritoryCountryColor(
        territoryId: number,
        countryId: number | null
    ) {

        if (countryId === null) {

            this.territoryManager.setNeutralColor(
                territoryId
            )

            return
        }


        const country =
            this.countryManager.getById(
                countryId
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
            territoryId,
            color
        )
    }


    // --------------------------------------------------
    // CERRAR PANEL DE PAÍSES
    // --------------------------------------------------

    private closeCountryPanel() {

        /*
        * Cerrar el panel mientras estamos
        * asignando también termina ese modo.
        */
        if (
            this.currentTool ===
            'assign-country'
        ) {

            this.setTool(
                'select'
            )
        }


        this.selectedCountryId =
            null


        this.clearTerritoryPreview()


        this.ui.countryPanel.classList.add(
            'hidden'
        )


        this.refreshCountryUI()
    }


    // --------------------------------------------------
    // CLICK FUERA DEL PANEL DE PAÍSES
    // --------------------------------------------------

    private handleDocumentPointerDown =
        (event: PointerEvent) => {

            // -----------------------------
            // PANEL YA CERRADO
            // -----------------------------

            if (
                this.ui.countryPanel.classList.contains(
                    'hidden'
                )
            ) {
                return
            }


            const target =
                event.target


            if (
                !(target instanceof Element)
            ) {
                return
            }


            // -----------------------------
            // CLICK DENTRO DEL PANEL
            // -----------------------------

            if (
                this.ui.countryPanel.contains(
                    target
                )
            ) {
                return
            }


            // -----------------------------
            // CLICK EN LA TOOLBAR
            // -----------------------------

            /*
            * Cambiar de herramienta no debe
            * cerrar el panel de países.
            */
            if (
                target.closest(
                    '.toolbar'
                ) !== null
            ) {
                return
            }


            // -----------------------------
            // SOLO SE CIERRA EN SELECT
            // -----------------------------

            if (
                this.currentTool !==
                'select'
            ) {
                return
            }


            this.closeCountryPanel()
        }

    // --------------------------------------------------
    // ZOOM
    // --------------------------------------------------

    private handleWheel =
        (event: WheelEvent) => {

            this.camera.handleWheel(
                event
            )
        }


    // --------------------------------------------------
    // CLICK CENTRAL
    // --------------------------------------------------

    private handleAuxClick =
        (event: MouseEvent) => {

            if (
                event.button === 1
            ) {
                event.preventDefault()
            }
        }


    // --------------------------------------------------
    // UNDO
    // --------------------------------------------------

    private async undo() {

        if (
            this.rebuildingHistory ||
            this.drawing.isDrawing ||
            this.camera.isPanning
        ) {
            return
        }

            const nextCommand =
                this.historyManager.peekUndo()

            if (nextCommand === null) {
                return
            }

            if (
                this.geographyLocked &&
                this.isGeographyCommand(
                    nextCommand
                )
            ) {

                this.ui.statusMessage.textContent =
                    'Reabrí la geografía para deshacer este cambio'

                return
            }

        const command =
            this.historyManager.undo()


        if (command === null) {
            return
        }

        this.rebuildingHistory = true

        try {

            await this.redrawHistory()

            this.updateProjectDirtyState()

            this.showHistoryMessage(
                command,
                'undo'
            )
        }

        finally {

            this.rebuildingHistory =
                false
        }
        
    }


    // --------------------------------------------------
    // REDO
    // --------------------------------------------------

    private async redo() {

        if (
            this.rebuildingHistory ||
            this.drawing.isDrawing ||
            this.camera.isPanning
        ) {
            return
        }

        const nextCommand =
            this.historyManager.peekRedo()

        if (nextCommand === null) {
            return
        }

        if (
            this.geographyLocked &&
            this.isGeographyCommand(
                nextCommand
            )
        ) {

            this.ui.statusMessage.textContent =
                'Reabrí la geografía para rehacer este cambio'

            return
        }

        const command =
            this.historyManager.redo()

        if (command === null) {
            return
        }

        this.rebuildingHistory =
            true

        try {

            await this.redrawHistory()

            this.updateProjectDirtyState()

            this.showHistoryMessage(
                command,
                'redo'
            )
        }

        finally {

            this.rebuildingHistory =
                false
        }
    }


    // --------------------------------------------------
    // MENSAJE DE UNDO / REDO
    // --------------------------------------------------

    private showHistoryMessage(
        command: HistoryCommand,
        action: 'undo' | 'redo'
    ) {

        const prefix =
            action === 'undo'
                ? 'Deshecho'
                : 'Rehecho'

        if (
            command.type === 'rename-territory'
        ) {

            const territory =
                this.territoryManager.getById(
                    command.territoryId
                )

            if (territory !== null) {

                this.ui.statusMessage.textContent =
                    `${prefix}: Territorio #${territory.id} ahora se llama "${territory.name}"`
            }

            return
        }

        if (
            command.type === 'create-territory'
        ) {

            this.ui.statusMessage.textContent =
                action === 'undo'
                    ? `Deshecho: creación del Territorio #${command.territoryId}`
                    : `Rehecho: creación del Territorio #${command.territoryId}`

            return
        }

        if (
            command.type === 'split-territory'
        ) {

            this.ui.statusMessage.textContent =
                action === 'undo'
                    ? 'División de territorio deshecha'
                    : 'División de territorio rehecha'

            return
        }

        if (
            command.type === 'delete-territory'
        ) {

            this.ui.statusMessage.textContent =
                action === 'undo'
                    ? `Deshecho: eliminación del Territorio #${command.territoryId}`
                    : `Rehecho: eliminación del Territorio #${command.territoryId}`

            return
        }

        if (
            command.type ===
            'assign-territory-country'
        ) {

            const currentCountryId =
                this.territoryControlManager.getCountryId(
                    command.territoryId
                )


            if (currentCountryId === null) {

                this.ui.statusMessage.textContent =
                    `${prefix}: Territorio #${command.territoryId} quedó sin país`

                return
            }


            const country =
                this.countryManager.getById(
                    currentCountryId
                )


            if (country !== null) {

                this.ui.statusMessage.textContent =
                    `${prefix}: Territorio #${command.territoryId} pertenece a "${country.name}"`
            }


            return
        }

        if (
            command.type === 'clear'
        ) {

            this.ui.statusMessage.textContent =
                action === 'undo'
                    ? 'Deshecho: limpiar mapa'
                    : 'Rehecho: limpiar mapa'

            return
        }

        if (
            command.type === 'stroke'
        ) {

            this.ui.statusMessage.textContent =
                action === 'undo'
                    ? 'Deshecho: trazo'
                    : 'Rehecho: trazo'
        }

        if (
            command.type ===
            'update-country'
        ) {

            const country =
                this.countryManager.getById(
                    command.countryId
                )


            if (country !== null) {

                this.ui.statusMessage.textContent =
                    `${prefix}: "${country.name}" actualizado`
            }

            return
        }

        if (
            command.type ===
            'delete-country'
        ) {

            const country =
                this.countryManager.getById(
                    command.countryId
                )


            if (
                action === 'undo' &&
                country !== null
            ) {

                this.ui.statusMessage.textContent =
                    `Deshecho: volvió "${country.name}"`

                return
            }


            this.ui.statusMessage.textContent =
                'Rehecho: país eliminado'

            return
        }
    }

    // --------------------------------------------------
    // RECONSTRUIR HISTORIAL
    // --------------------------------------------------

    private async redrawHistory() {

        this.clearTerritoryPreview()

        // --------------------------------
        // RESTAURAR ESTADO BASE
        // --------------------------------

        if (
            this.historyBaseProjectJson !== null
        ) {

            await this.projectManager.importFromJson(
                this.historyBaseProjectJson
            )
        }
        else {
            this.drawing.clear()
            this.territoryManager.reset()
            this.countryManager.reset()
            this.territoryControlManager.reset()
        }

        // --------------------------------
        // REPRODUCIR HISTORIAL
        // --------------------------------

        for (
            const command of
            this.historyManager.commands
        ) {

            // -----------------------------
            // TRAZO
            // -----------------------------

            if (
                command.type === 'stroke'
            ) {

                this.drawing.renderStroke(
                    command
                )
            }

            // -----------------------------
            // LIMPIAR
            // -----------------------------

            else if (
                command.type === 'clear'
            ) {

                this.drawing.clear()

                this.territoryManager.reset()

                this.territoryControlManager.reset()
            }


            // -----------------------------
            // TERRITORIO
            // -----------------------------

            else if (
                command.type ===
                'create-territory'
            ) {

                this.territoryManager.recreate(
                    command.territoryId,
                    command.seedX,
                    command.seedY,
                    this.drawing.getPixels()
                )
            }

            else if (
                command.type ===
                'delete-territory'
            ) {
                this.territoryManager.delete(
                    command.territoryId
                )

                this.territoryControlManager.assign(
                    command.territoryId,
                    null
                )
            }

            else if (
                command.type ===
                'split-territory'
            ) {
                /*
                * Primero recreamos la frontera.
                */
                this.drawing.renderStroke(
                    command.stroke
                )

                /*
                * Después calculamos las dos regiones.
                *
                * Pasamos el ID guardado para que
                * Undo/Redo no cree IDs distintos.
                */
                const result =
                    this.territoryManager.split(
                        command.territoryId,
                        this.drawing.getPixels(),
                        command.newTerritoryId
                    )

                if (
                    result.status ===
                    'split'
                ) {

                    /*
                    * El territorio nuevo hereda
                    * automáticamente el país que
                    * tenía el original en este punto
                    * del historial.
                    */
                    const countryId =
                        this.territoryControlManager
                            .getCountryId(
                                command.territoryId
                            )

                    if (
                        countryId !== null
                    ) {

                        this.territoryControlManager.assign(
                            command.newTerritoryId,
                            countryId
                        )
                    }
                }
            }

            // -----------------------------
            // RENOMBRAR TERRITORIO
            // -----------------------------
            else if (
                command.type ===
                'rename-territory'
            ) {

                this.territoryManager.rename(
                    command.territoryId,
                    command.name
                )
            }

            // -----------------------------
            // PAÍS
            // -----------------------------
            else if (
                command.type ===
                'create-country'
            ) {

                this.countryManager.recreate(
                    command.countryId,
                    command.name,
                    command.color
                )
            }

            // -----------------------------
            // ASIGNAR PAÍS A TERRITORIO
            // -----------------------------
            else if (
                command.type ===
                'assign-territory-country'
            ) {

                this.territoryControlManager.assign(
                    command.territoryId,
                    command.countryId
                )


                this.applyTerritoryCountryColor(
                    command.territoryId,
                    command.countryId
                )
            }

            else if (
                command.type ===
                'update-country'
            ) {

                this.countryManager.update(
                    command.countryId,
                    command.name,
                    command.color
                )

                this.recolorCountryTerritories(
                    command.countryId
                )
            }

            else if (
                command.type ===
                'delete-country'
            ) {

                const territoryIds =
                    this.territoryControlManager
                        .getTerritoryIdsByCountryId(
                            command.countryId
                        )

                for (
                    const territoryId of territoryIds
                ) {

                    this.territoryControlManager.assign(
                        territoryId,
                        null
                    )

                    this.territoryManager.setNeutralColor(
                        territoryId
                    )
                }

                this.countryManager.delete(
                    command.countryId
                )
            }
        }

        if (
            this.selectedCountryId !== null &&
            this.countryManager.getById(
                this.selectedCountryId
            ) === null
        ) {

            this.selectedCountryId =
                null


            if (
                this.currentTool ===
                'assign-country'
            ) {

                this.setTool(
                    'select'
                )
            }
        }

        this.refreshCountryUI()
        this.showSelectedCountry()
        this.refreshTerritorySelection()
    }


    // --------------------------------------------------
    // ASIGNAR PAÍS CON CLICK
    // --------------------------------------------------

    private assignSelectedCountryAt(
        x: number,
        y: number
    ) {

        this.clearTerritoryPreview()


        if (
            this.selectedCountryId === null
        ) {
            return
        }


        const country =
            this.countryManager.getById(
                this.selectedCountryId
            )


        if (country === null) {
            return
        }


        const territory =
            this.territoryManager.getAt(
                x,
                y
            )


        if (territory === null) {

            this.ui.statusMessage.textContent =
                'No hay ningún territorio aquí'

            return
        }


        const currentCountryId =
            this.territoryControlManager.getCountryId(
                territory.id
            )


        /*
        * Evitamos meter acciones inútiles
        * al historial.
        */
        if (
            currentCountryId ===
            country.id
        ) {

            this.ui.statusMessage.textContent =
                `${territory.name} ya pertenece a "${country.name}"`

            return
        }


        this.territoryControlManager.assign(
            territory.id,
            country.id
        )


        this.applyTerritoryCountryColor(
            territory.id,
            country.id
        )


        this.commitHistory({
            type: 'assign-territory-country',
            territoryId: territory.id,
            countryId: country.id,
        })


        this.ui.statusMessage.textContent =
            `${territory.name} asignado a "${country.name}"`
    }

    // --------------------------------------------------
    // REFRESCAR SELECCIÓN
    // --------------------------------------------------

    private refreshTerritorySelection() {

        if (
            this.selectedTerritoryId === null
        ) {
            return
        }

        const territory =
            this.territoryManager.getById(
                this.selectedTerritoryId
            )

        /*
        * Puede desaparecer, por ejemplo,
        * haciendo Undo sobre su creación.
        */
        if (territory === null) {

            this.clearTerritorySelection()

            return
        }

        this.showSelectedTerritory()
    }


    // --------------------------------------------------
    // ACTIVAR / FINALIZAR ASIGNACIÓN
    // --------------------------------------------------

    private handleAssignCountryClick =
        () => {

            if (
                this.selectedCountryId === null
            ) {
                return
            }


            if (
                this.currentTool ===
                'assign-country'
            ) {

                this.setTool(
                    'select'
                )


                this.showSelectedCountry()


                this.ui.statusMessage.textContent =
                    'Asignación de territorios finalizada'

                return
            }


            this.clearTerritorySelection()


            this.setTool(
                'assign-country'
            )


            this.showSelectedCountry()
        }


    // --------------------------------------------------
    // KEY DOWN
    // --------------------------------------------------

    private handleKeyDown =
        (event: KeyboardEvent) => {

            // -----------------------------
            // ESCAPE
            // -----------------------------

            if (
                event.key === 'Escape'
            ) {

                // -----------------------------
                // TERMINAR ASIGNACIÓN DE PAÍS
                // -----------------------------

                if (
                    this.currentTool ===
                    'assign-country'
                ) {

                    event.preventDefault()

                    this.closeCountryPanel()

                    return
                }


                // -----------------------------
                // CERRAR PANEL DE PAÍSES
                // -----------------------------

                if (
                    !this.ui.countryPanel.classList.contains(
                        'hidden'
                    )
                ) {

                    event.preventDefault()

                    this.closeCountryPanel()

                    return
                }


                // -----------------------------
                // CERRAR PANEL DE TERRITORIO
                // -----------------------------

                if (
                    this.selectedTerritoryId !== null
                ) {

                    event.preventDefault()

                    this.clearTerritorySelection()

                    return
                }
            }

            // -----------------------------
            // UNDO / REDO
            // -----------------------------

            if (
                event.ctrlKey &&
                !event.altKey
            ) {

                const key =
                    event.key.toLowerCase()


                // CTRL + Z

                if (
                    key === 'z' &&
                    !event.shiftKey
                ) {

                    event.preventDefault()

                    this.undo()

                    return
                }


                // CTRL + Y
                // CTRL + SHIFT + Z

                if (
                    key === 'y' ||
                    (
                        key === 'z' &&
                        event.shiftKey
                    )
                ) {

                    event.preventDefault()

                    this.redo()

                    return
                }
            }


            // -----------------------------
            // CTRL PREPARA PAN
            // -----------------------------

            if (
                event.key === 'Control'
            ) {

                this.ui.workspace.classList.add(
                    'pan-ready'
                )
            }
        }


    // --------------------------------------------------
    // KEY UP
    // --------------------------------------------------

    private handleKeyUp =
        (event: KeyboardEvent) => {

            if (
                event.key === 'Control' &&
                !this.camera.isPanning
            ) {

                this.ui.workspace.classList.remove(
                    'pan-ready'
                )
            }
        }


    // --------------------------------------------------
    // WINDOW BLUR
    // --------------------------------------------------

    private handleWindowBlur =
        () => {

            this.clearTerritoryPreview()
            this.drawing.cancelStroke()
            this.camera.stopPan()

            this.ui.workspace.classList.remove(
                'is-panning'
            )

            this.ui.workspace.classList.remove(
                'pan-ready'
            )
        }
    
    // --------------------------------------------------
    // PROGRAMAR PREVIEW DE TERRITORIO
    // --------------------------------------------------

    private scheduleTerritoryPreview(
        x: number,
        y: number
    ) {

        /*
        * Siempre guardamos la posición
        * más reciente del mouse.
        */
        this.pendingPreviewPosition = {
            x,
            y,
        }


        /*
        * Si ya hay un cálculo programado,
        * dejamos que utilice la última
        * posición disponible.
        */
        if (
            this.previewTimer !== null
        ) {
            return
        }


        /*
        * Máximo unas 20 actualizaciones
        * por segundo.
        */
        this.previewTimer =
            window.setTimeout(
                () => {

                    this.previewTimer =
                        null


                    const position =
                        this.pendingPreviewPosition


                    this.pendingPreviewPosition =
                        null


                    if (
                        position === null ||
                        this.currentTool !==
                        'territory'
                    ) {

                        this.preview.clear()

                        return
                    }


                    this.updateTerritoryPreview(
                        position.x,
                        position.y
                    )
                },
                50
            )
    }


    // --------------------------------------------------
    // ACTUALIZAR PREVIEW
    // --------------------------------------------------

    private updateTerritoryPreview(
        x: number,
        y: number
    ) {

        const region =
            this.territoryManager.findAvailableRegionAt(
                x,
                y,
                this.drawing.getPixels()
            )


        if (region === null) {

            this.preview.clear()

            return
        }


        this.preview.showRegion(
            region,
            TERRITORY_CREATION_PREVIEW_COLOR,
        )
    }


    // --------------------------------------------------
    // LIMPIAR PREVIEW
    // --------------------------------------------------

    private clearTerritoryPreview() {

        if (
            this.previewTimer !== null
        ) {

            window.clearTimeout(
                this.previewTimer
            )

            this.previewTimer =
                null
        }


        this.pendingPreviewPosition =
            null


        this.preview.clear()
    }


    // --------------------------------------------------
    // PROGRAMAR PREVIEW DE ASIGNACIÓN
    // --------------------------------------------------

    private scheduleCountryAssignmentPreview(
        x: number,
        y: number
    ) {

        this.pendingPreviewPosition = {
            x,
            y,
        }


        if (
            this.previewTimer !== null
        ) {
            return
        }


        this.previewTimer =
            window.setTimeout(
                () => {

                    this.previewTimer =
                        null


                    const position =
                        this.pendingPreviewPosition


                    this.pendingPreviewPosition =
                        null


                    if (
                        position === null ||
                        this.currentTool !==
                        'assign-country' ||
                        this.selectedCountryId === null
                    ) {

                        this.preview.clear()

                        return
                    }


                    this.updateCountryAssignmentPreview(
                        position.x,
                        position.y
                    )
                },
                50
            )
    }


    // --------------------------------------------------
    // ACTUALIZAR PREVIEW DE ASIGNACIÓN
    // --------------------------------------------------

    private updateCountryAssignmentPreview(
        x: number,
        y: number
    ) {

        if (
            this.selectedCountryId === null
        ) {

            this.preview.clear()

            return
        }


        const country =
            this.countryManager.getById(
                this.selectedCountryId
            )


        if (country === null) {

            this.preview.clear()

            return
        }


        const territory =
            this.territoryManager.getAt(
                x,
                y
            )


        if (territory === null) {

            this.preview.clear()

            return
        }


        const pixels =
            this.territoryManager.getRegionPixels(
                territory.id
            )


        if (pixels === null) {

            this.preview.clear()

            return
        }


        const color =
            hexToRgb(
                country.color
            )


        if (color === null) {

            this.preview.clear()

            return
        }


        this.preview.showRegion(
            pixels,
            color,
            120
        )
    }


    // --------------------------------------------------
    // BLOQUEAR / DESBLOQUEAR GEOGRAFÍA
    // --------------------------------------------------

    private handleGeographyLockClick =
        () => {

            if (this.geographyLocked) {

                this.unlockGeography()

                return
            }

            this.lockGeography()
        }

    
    // --------------------------------------------------
    // FINALIZAR GEOGRAFÍA
    // --------------------------------------------------

    private lockGeography() {

        this.geographyLocked =
            true

        this.clearTerritoryPreview()

        /*
        * Si estábamos usando una herramienta
        * geográfica, pasamos a Seleccionar.
        *
        * assign-country puede continuar porque
        * pertenece a la capa política.
        */
        if (
            this.currentTool === 'pencil' ||
            this.currentTool === 'eraser' ||
            this.currentTool === 'territory' ||
            this.currentTool === 'divide-territory'
        ) {

            this.setTool(
                'select'
            )
        }

        this.updateGeographyLockUI()

        this.updateProjectDirtyState()

        this.ui.statusMessage.textContent =
            'Geografía finalizada'
    }


    // --------------------------------------------------
    // REABRIR GEOGRAFÍA
    // --------------------------------------------------

    private unlockGeography() {

        this.geographyLocked =
            false


        this.updateGeographyLockUI()

        this.updateProjectDirtyState()

        this.ui.statusMessage.textContent =
            'Geografía editable'
    }


    // --------------------------------------------------
    // ACTUALIZAR BLOQUEO DE GEOGRAFÍA
    // --------------------------------------------------

    private updateGeographyLockUI() {

        const locked =
            this.geographyLocked

        this.ui.pencilButton.disabled =
            locked

        this.ui.eraserButton.disabled =
            locked

        this.ui.territoryButton.disabled =
            locked

        this.ui.brushSizeInput.disabled =
            locked

        this.ui.clearButton.disabled =
            locked

        this.ui.territoryDeleteButton.disabled =
            this.geographyLocked

        this.ui.territoryDivideButton.disabled =
            this.geographyLocked

        this.ui.geographyLockButton.textContent =
            locked
                ? '✏ Editar geografía'
                : '✓ Finalizar geografía'


        this.ui.workspace.classList.toggle(
            'geography-locked',
            locked
        )
    }


    // --------------------------------------------------
    // COMPROBAR SI ES COMANDO GEOGRÁFICO
    // --------------------------------------------------
    private isGeographyCommand(
        command: HistoryCommand
    ): boolean {

        return (
            command.type === 'stroke' ||
            command.type === 'create-territory' ||
            command.type === 'clear' ||
            command.type === 'delete-territory' ||
            command.type === 'split-territory'
        )
    }


    // --------------------------------------------------
    // GUARDAR CAMBIOS DEL PAÍS
    // --------------------------------------------------

    private handleSaveCountryClick =
        () => {

            if (
                this.selectedCountryId === null
            ) {
                return
            }


            const country =
                this.countryManager.getById(
                    this.selectedCountryId
                )


            if (country === null) {
                return
            }


            const newName =
                this.ui.selectedCountryNameInput.value.trim()


            const newColor =
                this.ui.selectedCountryColorInput.value


            if (newName.length === 0) {

                this.ui.statusMessage.textContent =
                    'El país debe tener un nombre'

                return
            }


            if (
                newName === country.name &&
                newColor === country.color
            ) {
                return
            }


            const updated =
                this.countryManager.update(
                    country.id,
                    newName,
                    newColor
                )


            if (updated === null) {
                return
            }


            /*
            * Si cambió el color, recoloreamos
            * todos los territorios controlados.
            */
            this.recolorCountryTerritories(
                updated.id
            )


            this.commitHistory({
                type: 'update-country',
                countryId: updated.id,
                name: updated.name,
                color: updated.color,
            })


            this.refreshCountryUI()

            this.showSelectedCountry()


            this.ui.statusMessage.textContent =
                `País "${updated.name}" actualizado`
    }


    // --------------------------------------------------
    // RECOLOREAR TERRITORIOS DE UN PAÍS
    // --------------------------------------------------

    private recolorCountryTerritories(
        countryId: number
    ) {

        const territoryIds =
            this.territoryControlManager
                .getTerritoryIdsByCountryId(
                    countryId
                )


        for (
            const territoryId of territoryIds
        ) {

            this.applyTerritoryCountryColor(
                territoryId,
                countryId
            )
        }
    }


    // --------------------------------------------------
    // ELIMINAR PAÍS
    // --------------------------------------------------

    private handleDeleteCountryClick =
        () => {

            if (
                this.selectedCountryId === null
            ) {
                return
            }


            const country =
                this.countryManager.getById(
                    this.selectedCountryId
                )


            if (country === null) {
                return
            }


            /*
            * Obtenemos primero los territorios
            * porque después eliminaremos
            * sus asignaciones.
            */
            const territoryIds =
                this.territoryControlManager
                    .getTerritoryIdsByCountryId(
                        country.id
                    )


            for (
                const territoryId of territoryIds
            ) {

                this.territoryControlManager.assign(
                    territoryId,
                    null
                )


                this.territoryManager.setNeutralColor(
                    territoryId
                )
            }


            if (
                this.currentTool ===
                'assign-country'
            ) {

                this.setTool(
                    'select'
                )
            }


            this.countryManager.delete(
                country.id
            )


            this.commitHistory({
                type: 'delete-country',
                countryId: country.id,
            })


            const deletedName =
                country.name


            this.selectedCountryId =
                null


            this.refreshCountryUI()

            this.showSelectedCountry()


            this.ui.statusMessage.textContent =
                `País "${deletedName}" eliminado`
    }


    // --------------------------------------------------
    // EXPORTAR PROYECTO
    // --------------------------------------------------

    private handleExportMapClick =
        () => {

            try {

                const json =
                    this.projectManager.exportToJson(
                        this.geographyLocked,
                        this.getProjectName()
                    )


                const blob =
                    new Blob(
                        [
                            json,
                        ],
                        {
                            type:
                                'application/json',
                        }
                    )


                const url =
                    URL.createObjectURL(
                        blob
                    )


                const link =
                    document.createElement(
                        'a'
                    )


                link.href =
                    url

                // ------------------------------
                // NOMBRE DE ARCHIVO SEGURO
                // ------------------------------
                const safeName =
                    this.getProjectName()
                        .replace(
                            /[^a-z0-9áéíóúüñ_-]+/gi,
                            '-'
                        )
                        .replace(
                            /^-+|-+$/g,
                            ''
                        )


                link.download =
                    `${safeName || 'mapa'}.json`


                link.click()


                URL.revokeObjectURL(
                    url
                )


                this.ui.statusMessage.textContent =
                    'Mapa exportado correctamente'
            }

            catch (error) {

                console.error(
                    error
                )


                this.ui.statusMessage.textContent =
                    'No se pudo exportar el mapa'
            }
        }


    private handleImportMapClick =
    () => {

        this.ui.importMapInput.click()
    }


    // --------------------------------------------------
    // IMPORTAR PROYECTO
    // --------------------------------------------------

    private handleImportMapChange =
        async () => {

            const file =
                this.ui.importMapInput.files?.[0]


            if (file === undefined) {
                return
            }

            const shouldImport =
                this.confirmDiscardUnsavedChanges(
                    `Importar "${file.name}"`
                )

            if (!shouldImport) {

                this.ui.importMapInput.value =
                    ''

                return
            }

            try {

                const json =
                    await file.text()

                const result =
                    await this.projectManager.importFromJson(
                        json
                    )

                // --------------------------------
                // EL MAPA IMPORTADO NO PERTENECE
                // TODAVÍA A INDEXEDDB
                // --------------------------------

                this.currentLocalProjectId =
                    null

                this.forgetLastLocalProject()

                this.ui.projectNameInput.value =
                    result.name

                // --------------------------------
                // BASELINE DEL UNDO / REDO
                // --------------------------------

                /*
                * El proyecto importado se convierte
                * en el nuevo punto de partida del
                * Undo / Redo.
                */
                this.historyBaseProjectJson =
                    this.projectManager.exportToJson(
                        result.geographyLocked,
                        result.name
                    )

                /*
                * Las acciones del proyecto anterior
                * ya no pertenecen a esta sesión.
                */
                this.historyManager.reset()

                this.geographyLocked =
                    result.geographyLocked

                // --------------------------------
                // ESTADO VISUAL
                // --------------------------------

                this.clearTerritoryPreview()

                this.clearTerritorySelection()

                this.selectedCountryId =
                    null

                /*
                * Siempre arrancamos en una
                * herramienta segura después
                * de importar.
                */
                this.setTool(
                    'select'
                )

                this.updateGeographyLockUI()

                this.refreshCountryUI()

                this.showSelectedCountry()

                // --------------------------------
                // ESTADO DE GUARDADO
                // --------------------------------

                /*
                * El proyecto importado es nuestro
                * nuevo estado base.
                *
                * Guardamos estos valores para poder
                * distinguir posteriormente los
                * cambios hechos sobre el importado.
                */
                this.savedHistoryStateId =
                    this.historyManager.stateId

                this.savedGeographyLocked =
                    this.geographyLocked

                this.savedProjectName =
                    this.getProjectName()

                /*
                * Pero el mapa todavía NO está
                * almacenado en IndexedDB.
                *
                * Por eso debe aparecer como
                * "Sin guardar".
                */
                this.requiresLocalSave =
                    true

                this.updateProjectDirtyState()

                this.ui.statusMessage.textContent =
                    `Mapa "${file.name}" importado correctamente`
            }

            catch (error) {

                console.error(
                    error
                )


                this.ui.statusMessage.textContent =
                    'No se pudo importar el mapa'
            }

            finally {

                /*
                * Permite volver a seleccionar
                * el mismo archivo posteriormente.
                */
                this.ui.importMapInput.value =
                    ''
            }
        }


    private getProjectName(): string {

        const name =
            this.ui.projectNameInput.value.trim()

        if (
            name.length === 0
        ) {
            return 'Mi mapa'
        }

        return name
    }


    // --------------------------------------------------
    // GUARDAR PROYECTO LOCAL
    // --------------------------------------------------

    private handleSaveLocalProjectClick =
        async () => {

            try {

                const name =
                    this.getProjectName()


                const json =
                    this.projectManager.exportToJson(
                        this.geographyLocked,
                        name
                    )


                const record =
                    await this.localProjectStore.save(
                        this.currentLocalProjectId,
                        name,
                        json
                    )

                this.currentLocalProjectId =
                    record.id

                this.rememberLastLocalProject(
                    record.id
                )

                this.ui.projectNameInput.value =
                    record.name

                this.requiresLocalSave =
                    false

                this.markCurrentStateAsSaved()

                this.ui.statusMessage.textContent =
                    `Mapa "${record.name}" guardado`


                if (
                    !this.ui.localProjectsPanel.classList.contains(
                        'hidden'
                    )
                ) {

                    await this.refreshLocalProjectsUI()
                }
            }

            catch (error) {

                console.error(
                    error
                )


                this.ui.statusMessage.textContent =
                    'No se pudo guardar el mapa'
            }
        }
    

    private handleLocalProjectsClick =
        async () => {

            const isOpen =
                !this.ui.localProjectsPanel.classList.contains(
                    'hidden'
                )


            if (isOpen) {

                this.ui.localProjectsPanel.classList.add(
                    'hidden'
                )

                return
            }


            await this.refreshLocalProjectsUI()


            this.ui.localProjectsPanel.classList.remove(
                'hidden'
            )
        }


    private handleLocalProjectsCloseClick =
        () => {

            this.ui.localProjectsPanel.classList.add(
                'hidden'
            )
        }

    
    // --------------------------------------------------
    // REFRESCAR LISTA DE PROYECTOS LOCALES
    // --------------------------------------------------
    private async refreshLocalProjectsUI() {

        const projects =
            await this.localProjectStore.getAll()


        this.ui.localProjectsList.replaceChildren()


        if (
            projects.length === 0
        ) {

            const empty =
                document.createElement(
                    'span'
                )


            empty.textContent =
                'Todavía no hay mapas guardados.'


            this.ui.localProjectsList.append(
                empty
            )


            return
        }


        for (
            const project of projects
        ) {

            const item =
                this.createLocalProjectItem(
                    project
                )


            this.ui.localProjectsList.append(
                item
            )
        }
    }


    private createLocalProjectItem(
        project: LocalProjectRecord
    ): HTMLElement {

        const item =
            document.createElement(
                'div'
            )


        item.className =
            'local-project-item'


        // -----------------------------
        // INFORMACIÓN
        // -----------------------------

        const info =
            document.createElement(
                'div'
            )


        info.className =
            'local-project-info'


        const name =
            document.createElement(
                'span'
            )


        name.className =
            'local-project-name'


        name.textContent =
            project.name


        const date =
            document.createElement(
                'span'
            )


        date.className =
            'local-project-date'


        date.textContent =
            `Modificado: ${
                new Date(
                    project.updatedAt
                ).toLocaleString()
            }`


        info.append(
            name,
            date
        )


        // -----------------------------
        // ACCIONES
        // -----------------------------

        const actions =
            document.createElement(
                'div'
            )


        actions.className =
            'local-project-actions'


        const loadButton =
            document.createElement(
                'button'
            )


        loadButton.type =
            'button'

        loadButton.textContent =
            'Abrir'


        loadButton.addEventListener(
            'click',
            () => {

                void this.loadLocalProject(
                    project
                )
            }
        )


        const deleteButton =
            document.createElement(
                'button'
            )


        deleteButton.type =
            'button'

        deleteButton.textContent =
            '🗑'


        deleteButton.addEventListener(
            'click',
            () => {

                void this.deleteLocalProject(
                    project
                )
            }
        )


        actions.append(
            loadButton,
            deleteButton
        )


        item.append(
            info,
            actions
        )


        return item
    }


    // --------------------------------------------------
    // CARGAR PROYECTO LOCAL
    // --------------------------------------------------
    private async loadLocalProject(
        project: LocalProjectRecord,
        askBeforeReplace = true
    ) {

        if (askBeforeReplace) {

            const shouldLoad =
                this.confirmDiscardUnsavedChanges(
                    `Abrir "${project.name}"`
                )

            if (!shouldLoad) {
                return
            }
        }

        try {

            const result =
                await this.projectManager.importFromJson(
                    project.json
                )


            /*
            * El proyecto cargado pasa a ser
            * el baseline del nuevo historial.
            */
            this.historyBaseProjectJson =
                this.projectManager.exportToJson(
                    result.geographyLocked,
                    result.name
                )


            this.historyManager.reset()


            this.geographyLocked =
                result.geographyLocked


            this.currentLocalProjectId =
                project.id

            this.requiresLocalSave =
                false

            this.rememberLastLocalProject(
                project.id
            )


            this.ui.projectNameInput.value =
                result.name


            this.clearTerritoryPreview()

            this.clearTerritorySelection()


            this.selectedCountryId =
                null


            this.setTool(
                'select'
            )


            this.updateGeographyLockUI()

            this.refreshCountryUI()

            this.showSelectedCountry()


            this.markCurrentStateAsSaved()


            this.ui.localProjectsPanel.classList.add(
                'hidden'
            )


            this.ui.statusMessage.textContent =
                `Mapa "${result.name}" cargado`
        }

        catch (error) {

            console.error(
                error
            )


            this.ui.statusMessage.textContent =
                'No se pudo cargar el mapa'
        }
    }
    


    // --------------------------------------------------
    // ELIMINAR PROYECTO LOCAL
    // --------------------------------------------------
    private async deleteLocalProject(
        project: LocalProjectRecord
    ) {

        const shouldDelete =
            window.confirm(
                `¿Eliminar "${project.name}" de los mapas guardados?`
            )

        if (!shouldDelete) {
            return
        }

        try {

            await this.localProjectStore.delete(
                project.id
            )

            /*
            * Si eliminamos del almacenamiento
            * el proyecto actualmente abierto,
            * el mapa sigue abierto.
            *
            * El próximo Guardar creará nuevamente
            * un proyecto local.
            */
            if (
                this.currentLocalProjectId ===
                project.id
            ) {

                this.currentLocalProjectId =
                    null

                this.requiresLocalSave =
                    true

                this.forgetLastLocalProject()

                this.updateProjectDirtyState()
            }


            await this.refreshLocalProjectsUI()


            this.ui.statusMessage.textContent =
                `Mapa "${project.name}" eliminado del almacenamiento`
        }

        catch (error) {

            console.error(
                error
            )


            this.ui.statusMessage.textContent =
                'No se pudo eliminar el mapa'
        }
    }


    // --------------------------------------------------
    // ESTADO DEL PROYECTO
    // --------------------------------------------------

    private updateProjectDirtyState() {

        this.projectDirty =
            this.requiresLocalSave
            ||
            (
                this.historyManager.stateId !==
                this.savedHistoryStateId
            )
            ||
            (
                this.geographyLocked !==
                this.savedGeographyLocked
            )
            ||
            (
                this.getProjectName() !==
                this.savedProjectName
            )


        this.updateProjectSaveStateUI()
    }


    // --------------------------------------------------
    // MARCAR ESTADO ACTUAL COMO GUARDADO
    // --------------------------------------------------

    private markCurrentStateAsSaved() {

        this.savedHistoryStateId =
            this.historyManager.stateId

        this.savedGeographyLocked =
            this.geographyLocked

        this.savedProjectName =
            this.getProjectName()

        this.projectDirty =
            false

        this.updateProjectSaveStateUI()
    }


    // --------------------------------------------------
    // INDICADOR
    // --------------------------------------------------

    private updateProjectSaveStateUI() {

        this.ui.projectSaveState.classList.toggle(
            'dirty',
            this.projectDirty
        )

        if (this.projectDirty) {

            this.ui.projectSaveState.textContent =
                '● Sin guardar'

            return
        }

        if (
            this.currentLocalProjectId !== null
        ) {

            this.ui.projectSaveState.textContent =
                'Guardado'

            return
        }

        this.ui.projectSaveState.textContent =
            'Sin cambios'
    }


    // --------------------------------------------------
    // COMMIT HISTORY
    // --------------------------------------------------

    private commitHistory(
        command: HistoryCommand
    ) {

        this.historyManager.push(
            command
        )


        this.updateProjectDirtyState()
    }


    private handleProjectNameInput =
    () => {

        this.updateProjectDirtyState()
    }


    // --------------------------------------------------
    // CONFIRMAR PÉRDIDA DE CAMBIOS
    // --------------------------------------------------

    private confirmDiscardUnsavedChanges(
        action: string
    ): boolean {

        if (!this.projectDirty) {
            return true
        }

        return window.confirm(
            `Hay cambios sin guardar.\n\n${action} descartará esos cambios.\n\n¿Continuar?`
        )
    }


    // --------------------------------------------------
    // NUEVO MAPA
    // --------------------------------------------------

    private handleNewProjectClick =
        () => {

            const shouldCreate =
                this.confirmDiscardUnsavedChanges(
                    'Crear un mapa nuevo'
                )


            if (!shouldCreate) {
                return
            }


            this.createNewProject()
        }
    

    // --------------------------------------------------
    // CREAR NUEVO PROYECTO
    // --------------------------------------------------
    
    private createNewProject() {

        // -----------------------------
        // ESTADO VISUAL
        // -----------------------------

        this.clearTerritoryPreview()
        this.clearTerritorySelection()

        this.ui.countryPanel.classList.add(
            'hidden'
        )

        this.ui.localProjectsPanel.classList.add(
            'hidden'
        )


        // -----------------------------
        // MAPA
        // -----------------------------

        this.drawing.clear()
        this.territoryManager.reset()
        this.countryManager.reset()
        this.territoryControlManager.reset()


        // -----------------------------
        // ESTADO DEL EDITOR
        // -----------------------------

        this.selectedCountryId =
            null

        this.geographyLocked =
            false

        this.currentLocalProjectId =
            null

        this.requiresLocalSave =
            false

        this.forgetLastLocalProject()

        this.historyBaseProjectJson =
            null

        this.historyManager.reset()


        // -----------------------------
        // PROYECTO
        // -----------------------------

        this.ui.projectNameInput.value =
            'Mi mapa'

        this.setTool(
            'pencil'
        )

        this.updateGeographyLockUI()
        this.refreshCountryUI()
        this.showSelectedCountry()

        this.camera.resetView()

        /*
        * El mapa nuevo vacío es nuestro
        * nuevo estado inicial.
        */
        this.markCurrentStateAsSaved()

        this.ui.statusMessage.textContent =
            'Nuevo mapa creado'
    }


    // --------------------------------------------------
    // COMPROBAR SI HAY CAMBIOS SIN GUARDAR
    // --------------------------------------------------
    private handleBeforeUnload =
        (event: BeforeUnloadEvent) => {

            if (!this.projectDirty) {
                return
            }

            event.preventDefault()

            /*
            * Los navegadores modernos muestran
            * su propio texto de confirmación.
            */
            event.returnValue =
                ''
        }


    // --------------------------------------------------
    // ÚLTIMO PROYECTO LOCAL
    // --------------------------------------------------

    private rememberLastLocalProject(
        projectId: string
    ) {

        localStorage.setItem(
            LAST_LOCAL_PROJECT_KEY,
            projectId
        )
    }


    private forgetLastLocalProject() {

        localStorage.removeItem(
            LAST_LOCAL_PROJECT_KEY
        )
    }


    private getLastLocalProjectId():
        string | null {

        return localStorage.getItem(
            LAST_LOCAL_PROJECT_KEY
        )
    }


    // --------------------------------------------------
    // RESTAURAR ÚLTIMO PROYECTO
    // --------------------------------------------------

    private async restoreLastLocalProject() {

        const projectId =
            this.getLastLocalProjectId()


        if (projectId === null) {
            return
        }


        try {

            const project =
                await this.localProjectStore.getById(
                    projectId
                )


            /*
            * Puede ocurrir que localStorage todavía
            * tenga el ID pero el proyecto haya sido
            * eliminado de IndexedDB.
            */
            if (project === null) {

                this.forgetLastLocalProject()

                return
            }


            await this.loadLocalProject(
                project,
                false
            )


            this.ui.statusMessage.textContent =
                `Mapa "${project.name}" restaurado`
        }

        catch (error) {

            console.error(
                'No se pudo restaurar el último mapa',
                error
            )


            /*
            * No queremos impedir que arranque el editor
            * simplemente porque la restauración falló.
            */
            this.ui.statusMessage.textContent =
                'No se pudo restaurar el último mapa'
        }
    }
}
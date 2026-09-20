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
    TERRITORY_CREATION_PREVIEW_COLOR,
} from '../map/colors'

import {
    ProjectController,
} from '../project/ProjectController'

import {
    TimelineController,
} from '../timeline/TimelineController'

import {
    PoliticsController,
} from './PoliticsController'

export class InputController {

    private ui: EditorUI

    private camera: CameraController
    private drawing: DrawingController
    private territoryManager: TerritoryManager
    private historyManager: HistoryManager

    private currentTool: Tool = 'pencil'

    private politicsController: PoliticsController

    private started = false

    private selectedTerritoryId: number | null = null

    private preview: TerritoryPreviewController

    private pendingPreviewPosition: Point | null = null

    private previewTimer: number | null = null

    private countryManager: CountryManager

    private territoryControlManager: TerritoryControlManager

    private geographyLocked = false

    private projectController: ProjectController

    private rebuildingHistory = false

    private splittingTerritoryId: number | null = null

    private timelineController: TimelineController

    constructor(
        ui: EditorUI,
        camera: CameraController,
        drawing: DrawingController,
        territoryManager: TerritoryManager,
        historyManager: HistoryManager,
        preview: TerritoryPreviewController,
        countryManager: CountryManager,
        territoryControlManager: TerritoryControlManager,
        projectController: ProjectController,
        timelineController: TimelineController,
        politicsController: PoliticsController
    ) {
        this.ui = ui
        this.camera = camera
        this.drawing = drawing
        this.territoryManager = territoryManager
        this.historyManager = historyManager
        this.preview = preview
        this.countryManager = countryManager
        this.territoryControlManager = territoryControlManager
        this.projectController = projectController
        this.timelineController = timelineController
        this.politicsController = politicsController

        this.projectController
            .setEditorBridge({
                getGeographyLocked:
                    () =>
                        this.geographyLocked,

                applyLoadedProject:
                    geographyLocked => {

                        this.applyLoadedProjectState(
                            geographyLocked
                        )
                    },

                resetForNewProject:
                    () => {

                        this.resetEditorForNewProject()
                    },
            })

        this.politicsController
            .setEditorBridge({
                getCurrentTool:
                    () =>
                        this.currentTool,

                setTool:
                    tool => {

                        this.setTool(
                            tool
                        )
                    },

                getSelectedTerritoryId:
                    () =>
                        this.selectedTerritoryId,

                clearTerritorySelection:
                    () => {

                        this.clearTerritorySelection()
                    },

                commitHistory:
                    command => {

                        this.commitHistory(
                            command
                        )
                    },

                getGeographyLocked:
                    () =>
                        this.geographyLocked,
            })
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


        /*
         * Dejamos explícitamente sincronizada
         * la herramienta inicial con la UI.
         */
        this.setTool(
            'pencil'
        )

        this.timelineController.start()

        this.projectController.start()

        this.politicsController.start()

        this.updateGeographyLockUI()
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


        // -----------------------------
        // WORKSPACE
        // -----------------------------
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

        this.politicsController.stop()

        this.timelineController.stop()

        this.projectController.stop()
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
            this.currentTool ===
                'assign-country' &&
            tool !==
                'assign-country'

        if (
            leavingCountryAssignment
        ) {

            this.politicsController
                .clearAssignmentPreview()
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

        this.currentTool =
            tool

        // --------------------------------
        // BOTONES
        // --------------------------------

        this.ui.pencilButton
            .classList.toggle(
                'active',
                tool === 'pencil'
            )

        this.ui.eraserButton
            .classList.toggle(
                'active',
                tool === 'eraser'
            )

        this.ui.territoryButton
            .classList.toggle(
                'active',
                tool === 'territory'
            )

        this.ui.selectButton
            .classList.toggle(
                'active',
                tool === 'select'
            )

        // --------------------------------
        // WORKSPACE
        // --------------------------------

        this.ui.workspace
            .classList.toggle(
                'territory-mode',
                tool === 'territory'
            )

        this.ui.workspace
            .classList.toggle(
                'divide-territory-mode',
                tool ===
                    'divide-territory'
            )

        this.ui.workspace
            .classList.toggle(
                'select-mode',
                tool === 'select'
            )

        this.ui.workspace
            .classList.toggle(
                'assign-country-mode',
                tool ===
                    'assign-country'
            )

        // --------------------------------
        // MENSAJE
        // --------------------------------

        switch (
            tool
        ) {

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

                const countryName =
                    this.politicsController
                        .getSelectedCountryName()

                if (
                    countryName === null
                ) {

                    this.ui.statusMessage.textContent =
                        'Seleccioná un país para asignar territorios'

                    break
                }

                this.ui.statusMessage.textContent =
                    `Asignando territorios a: ${countryName}`

                break
            }
        }


        /*
        * El PoliticsController actualiza
        * el botón "Asignar territorios" /
        * "Finalizar asignación" y cualquier
        * otra UI política dependiente
        * de la herramienta actual.
        */
        this.politicsController
            .syncToolUI()
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
            this.politicsController.clearAssignmentPreview()
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
            this.territoryManager.reset(false)
            this.territoryControlManager.reset()
            this.clearTerritorySelection()
            this.clearTerritoryPreview()
            this.politicsController.refreshUI()

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

                this.politicsController.assignSelectedCountryAt(
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


                this.politicsController.scheduleAssignmentPreview(
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
                    * Un lápiz/borrador normal ahora
                    * debe sincronizar también los
                    * territorios.
                    */
                    void this.finishBorderStroke(
                        completedStroke
                    )
                }
            }

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
    // TERMINAR EDICIÓN NORMAL DE FRONTERAS
    // --------------------------------------------------

    private async finishBorderStroke(
        stroke: StrokeCommand
    ) {

        const result =
            this.reconcileTerritoriesAfterBorderChange()

        // --------------------------------
        // EDICIÓN INVÁLIDA
        // --------------------------------

        if (
            result.status ===
            'open-region'
        ) {

            /*
            * El stroke todavía no fue agregado
            * al historial.
            *
            * Reconstruimos el estado anterior y
            * la línea inválida desaparece.
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

            this.ui.statusMessage.textContent =
                'La edición dejaría un territorio abierto. Se descartó el cambio.'

            return
        }

        /*
        * Recién ahora sabemos que la modificación
        * geográfica es válida.
        */
        this.commitHistory(
            stroke
        )

        this.politicsController.refreshUI()

        this.refreshTerritorySelection()

        if (
            result.createdTerritories.length > 0
        ) {

            const createdIds =
                result.createdTerritories
                    .map(
                        item =>
                            `#${item.territoryId}`
                    )
                    .join(
                        ', '
                    )

            this.ui.statusMessage.textContent =
                `Frontera actualizada. Nuevos territorios: ${createdIds}`

            return
        }

        if (
            result.deletedTerritoryIds.length > 0
        ) {

            this.ui.statusMessage.textContent =
                'Frontera actualizada. Se fusionaron territorios.'

            return
        }

        this.ui.statusMessage.textContent =
            'Frontera actualizada'
    }


    // --------------------------------------------------
    // SINCRONIZAR TERRITORIOS DESPUÉS DE FRONTERAS
    // --------------------------------------------------

    private reconcileTerritoriesAfterBorderChange() {

        const result =
            this.territoryManager
                .reconcileWithBorders(
                    this.drawing.getPixels()
                )

        if (
            result.status !==
            'reconciled'
        ) {
            return result
        }

        // --------------------------------
        // HEREDAR HISTORIA POLÍTICA
        // --------------------------------
        if (
            this.timelineController
                .isInitialized &&
            !this.rebuildingHistory
        ) {

            for (
                const created of
                result.createdTerritories
            ) {

                this.timelineController
                    .registerTerritorySplit(
                        created.territoryId,
                        created.sourceTerritoryId
                    )
            }
        }

        /*
        * Primero capturamos qué país debe
        * heredar cada territorio nuevo.
        *
        * Lo hacemos antes de eliminar
        * asignaciones antiguas.
        */
        const inheritedCountries =
            result.createdTerritories.map(
                created => ({
                    territoryId:
                        created.territoryId,

                    countryId:
                        this.territoryControlManager
                            .getCountryId(
                                created.sourceTerritoryId
                            ),
                })
            )

        // --------------------------------
        // TERRITORIOS ELIMINADOS
        // --------------------------------

        for (
            const territoryId of
            result.deletedTerritoryIds
        ) {

            this.territoryControlManager.assign(
                territoryId,
                null
            )
        }

        // --------------------------------
        // TERRITORIOS NUEVOS
        // --------------------------------

        for (
            const inherited of
            inheritedCountries
        ) {

            if (
                inherited.countryId ===
                null
            ) {
                continue
            }

            this.territoryControlManager.assign(
                inherited.territoryId,
                inherited.countryId
            )

            this.politicsController.applyTerritoryCountryColor(
                inherited.territoryId,
                inherited.countryId
            )
        }

        return result
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
        // HEREDAR HISTORIA POLÍTICA
        // --------------------------------

        const historicalSplit =
            this.timelineController.isInitialized

        /*
        * Si el timeline ya existe, este nuevo
        * territorio nace históricamente del
        * territorio que acabamos de dividir.
        *
        * Si el timeline todavía no existe,
        * no hace falta linaje: ambos territorios
        * formarán parte del estado inicial.
        */
        if (
            historicalSplit
        ) {

            this.timelineController
                .registerTerritorySplit(
                    result.newTerritoryId,
                    territoryId
                )
        }

        const countryId =
            historicalSplit
                ? this.timelineController
                    .getTerritoryOwnerAtCurrentDate(
                        result.newTerritoryId
                    )
                : this.territoryControlManager
                    .getCountryId(
                        territoryId
                    )

        this.territoryControlManager.assign(
            result.newTerritoryId,
            countryId
        )

        this.politicsController.applyTerritoryCountryColor(
            result.newTerritoryId,
            countryId
        )


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

        this.politicsController
            .refreshTerritoryCountrySelect(
                territory.id
            )
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
        
        this.politicsController
            .refreshTerritoryCountrySelect(
                null
            )
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

            this.projectController.updateDirtyState()

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

            this.projectController.updateDirtyState()

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

        const restoredBase =
            await this.projectController
                .restoreHistoryBase()

        if (
            !restoredBase
        ) {

            this.drawing.clear()
            this.territoryManager.reset(
                false
            )

            this.countryManager.reset()
            this.territoryControlManager.reset()
        }
        else {
            this.drawing.clear()
            this.territoryManager.reset(false)
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

                const result =
                    this.reconcileTerritoriesAfterBorderChange()

                /*
                * Un stroke que llegó al historial ya
                * fue validado cuando se creó.
                *
                * Si esto ocurre indicaría una
                * inconsistencia interna.
                */
                if (
                    result.status !==
                    'reconciled'
                ) {

                    throw new Error(
                        'El historial contiene una edición geográfica inválida'
                    )
                }
            }

            // -----------------------------
            // LIMPIAR
            // -----------------------------

            else if (
                command.type === 'clear'
            ) {

                this.drawing.clear()

                this.territoryManager.reset(false)

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

                this.politicsController.applyTerritoryCountryColor(
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

                this.politicsController.recolorCountryTerritories(
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

        this.politicsController
            .refreshUI()

        this.refreshTerritorySelection()
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

                /*
                * Primero dejamos que PoliticsController
                * maneje:
                *
                * - salir de assign-country
                * - cerrar el panel de países
                */
                if (
                    this.politicsController
                        .handleEscape()
                ) {

                    event.preventDefault()

                    return
                }

                /*
                * Si PoliticsController no consumió
                * el Escape, intentamos cerrar el
                * territorio seleccionado.
                */
                if (
                    this.selectedTerritoryId !==
                    null
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
            this.politicsController.clearAssignmentPreview()
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

        this.timelineController.initializeIfNeeded()

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

        this.projectController.updateDirtyState()

        this.ui.statusMessage.textContent =
            'Geografía finalizada'
    }


    // --------------------------------------------------
    // REABRIR GEOGRAFÍA
    // --------------------------------------------------

    private unlockGeography() {

        this.geographyLocked =
            false

        if (
            this.timelineController.isInitialized &&
            this.currentTool ===
                'assign-country'
        ) {

            this.setTool(
                'select'
            )
        }

        this.updateGeographyLockUI()

        this.projectController.updateDirtyState()

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

        this.timelineController.setVisible(locked)

        const historicalPoliticsDisabled =
            this.timelineController.isInitialized &&
            !locked

        this.ui.assignCountryButton.disabled =
            historicalPoliticsDisabled

        this.ui.territoryCountrySelect.disabled =
            historicalPoliticsDisabled
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
    // COMMIT HISTORY
    // --------------------------------------------------

    private commitHistory(
        command: HistoryCommand
    ) {

        this.historyManager.push(
            command
        )

        this.projectController.updateDirtyState()
    }


    // --------------------------------------------------
    // APLICAR ESTADO DE PROYECTO CARGADO
    // --------------------------------------------------
    private applyLoadedProjectState(
        geographyLocked: boolean
    ) {

        /*
        * El timeline todavía no se persiste.
        *
        * Cada proyecto cargado empieza con
        * un timeline limpio basado en su
        * estado político actual.
        */
        this.timelineController.reset()


        this.geographyLocked =
            geographyLocked


        this.clearTerritoryPreview()

        this.clearTerritorySelection()

        this.setTool(
            'select'
        )

        if (
            geographyLocked
        ) {

            this.timelineController
                .initializeIfNeeded()
        }

        this.updateGeographyLockUI()

        this.politicsController.resetSelection()
    }


    // --------------------------------------------------
    // REINICIAR EDITOR PARA NUEVO PROYECTO
    // --------------------------------------------------
    private resetEditorForNewProject() {

        this.clearTerritoryPreview()

        this.clearTerritorySelection()

        this.ui.countryPanel.classList.add(
            'hidden'
        )

        this.drawing.clear()

        this.territoryManager.reset()

        this.countryManager.reset()

        this.territoryControlManager.reset()

        this.geographyLocked =
            false

        this.timelineController.reset()

        this.setTool(
            'pencil'
        )

        this.updateGeographyLockUI()

        this.politicsController.resetSelection()

        this.camera.resetView()
    }
}
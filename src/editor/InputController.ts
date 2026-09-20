import type {
    DrawingTool,
    Tool,
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
    CountryManager,
} from '../map/CountryManager'

import {
    TerritoryControlManager,
} from '../map/TerritoryControlManager'

import {
    ProjectController,
} from '../project/ProjectController'

import {
    TimelineController,
} from '../timeline/TimelineController'

import {
    PoliticsController,
} from './PoliticsController'

import {
    GeographyController,
} from './GeographyController'

import {
    EditorHistoryController,
} from '../history/EditorHistoryController'

export class InputController {

    private ui: EditorUI

    private camera: CameraController
    private drawing: DrawingController
    private territoryManager: TerritoryManager

    private currentTool: Tool = 'pencil'

    private politicsController: PoliticsController

    private started = false

    private countryManager: CountryManager

    private territoryControlManager: TerritoryControlManager

    private projectController: ProjectController

    private timelineController: TimelineController

    private geographyController: GeographyController

    private historyController: EditorHistoryController

    constructor(
        ui: EditorUI,
        camera: CameraController,
        drawing: DrawingController,
        territoryManager: TerritoryManager,
        countryManager: CountryManager,
        territoryControlManager: TerritoryControlManager,
        projectController: ProjectController,
        timelineController: TimelineController,
        politicsController: PoliticsController,
        geographyController: GeographyController,
        historyController: EditorHistoryController
    ) {
        this.ui = ui
        this.camera = camera
        this.drawing = drawing
        this.territoryManager = territoryManager
        this.countryManager = countryManager
        this.territoryControlManager = territoryControlManager
        this.projectController = projectController
        this.timelineController = timelineController
        this.politicsController = politicsController
        this.geographyController = geographyController
        this.historyController = historyController

        this.projectController
            .setEditorBridge({
                getGeographyLocked:
                    () =>
                        this.geographyController.isLocked,

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
                        this.geographyController.selectedTerritoryId,

                clearTerritorySelection:
                    () => {

                        this.geographyController.clearTerritorySelection()
                    },

                commitHistory:
                    command => {

                        this.historyController.commit(
                            command
                        )
                    },

                getGeographyLocked:
                    () =>
                        this.geographyController.isLocked,
            })

        this.geographyController
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

                commitHistory:
                    command => {

                        this.historyController.commit(
                            command
                        )
                    },

                updateProjectDirtyState:
                    () => {

                        this.projectController
                            .updateDirtyState()
                    },

                refreshPoliticsUI:
                    () => {

                        this.politicsController
                            .refreshUI()
                    },

                refreshTerritoryCountrySelect:
                    territoryId => {

                        this.politicsController
                            .refreshTerritoryCountrySelect(
                                territoryId
                            )
                    },

                redrawHistory:
                    () =>
                        this.historyController
                            .redrawHistory(),

                applyTerritoryCountryColor:
                    (
                        territoryId,
                        countryId
                    ) => {

                        this.politicsController
                            .applyTerritoryCountryColor(
                                territoryId,
                                countryId
                            )
                    },
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

        this.ui.resetViewButton.addEventListener(
            'click',
            this.handleResetViewClick
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

        this.geographyController.start()

        this.geographyController.updateLockUI()
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

        this.ui.resetViewButton.removeEventListener(
            'click',
            this.handleResetViewClick
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

        this.geographyController.stop()
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
            this.geographyController.isLocked &&
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

            this.geographyController.cancelTerritorySplit()
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

            this.geographyController.clearTerritoryPreview()
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

                this.geographyController.clearTerritoryPreview()
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

                this.geographyController.createTerritory(
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

                this.geographyController.selectTerritory(
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

                const brushSize =
                    Number(
                        this.ui.brushSizeInput.value
                    )

                const started =
                    this.geographyController
                        .startTerritorySplitStroke(
                            position.x,
                            position.y,
                            brushSize
                        )

                if (
                    !started
                ) {

                    this.setTool(
                        'select'
                    )

                    return
                }

                this.ui.workspace
                    .setPointerCapture(
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

                    this.geographyController.clearTerritoryPreview()

                    return
                }


                this.geographyController.scheduleTerritoryPreview(
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

                    this.geographyController.clearTerritoryPreview()

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

                    void this.geographyController.finishTerritorySplit(
                        completedStroke
                    )
                }

                else {

                    /*
                    * Un lápiz/borrador normal ahora
                    * debe sincronizar también los
                    * territorios.
                    */
                    void this.geographyController.finishBorderStroke(
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
                    this.geographyController.selectedTerritoryId !==
                    null
                ) {

                    event.preventDefault()

                    this.geographyController.clearTerritorySelection()

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

                    void this.historyController.undo()

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

                    void this.historyController.redo()

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

            this.geographyController.clearTerritoryPreview()
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

        this.geographyController.clearTerritoryPreview()

        this.geographyController.clearTerritorySelection()

        this.setTool(
            'select'
        )

        this.geographyController
            .reset()

        this.geographyController
            .setLockedState(
                geographyLocked
            )

        this.politicsController.resetSelection()
    }


    // --------------------------------------------------
    // REINICIAR EDITOR PARA NUEVO PROYECTO
    // --------------------------------------------------
    private resetEditorForNewProject() {

        this.geographyController.clearTerritoryPreview()

        this.geographyController.clearTerritorySelection()

        this.ui.countryPanel.classList.add(
            'hidden'
        )

        this.drawing.clear()

        this.territoryManager.reset()

        this.countryManager.reset()

        this.territoryControlManager.reset()

        this.timelineController.reset()

        this.setTool(
            'pencil'
        )

        this.geographyController.reset()

        this.politicsController.resetSelection()

        this.camera.resetView()
    }
}
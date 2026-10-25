import {
    MAP_WIDTH,
    MAP_HEIGHT,
} from '../config/mapConfig'


export type EditorUI = {
    workspace: HTMLElement
    mapContainer: HTMLDivElement

    referenceCanvas: HTMLCanvasElement
    borderCanvas: HTMLCanvasElement
    previewCanvas: HTMLCanvasElement
    territoryCanvas: HTMLCanvasElement

    pencilButton: HTMLButtonElement
    eraserButton: HTMLButtonElement
    territoryButton: HTMLButtonElement
    selectButton: HTMLButtonElement
    territoryDivideButton: HTMLButtonElement

    clearButton: HTMLButtonElement
    resetViewButton: HTMLButtonElement

    eraserSizeControl: HTMLLabelElement
    eraserSizeSelect: HTMLSelectElement
    eraserCursor: HTMLDivElement

    zoomValue: HTMLSpanElement
    statusMessage: HTMLSpanElement

    territoryPanel: HTMLElement
    territoryIdValue: HTMLSpanElement
    territoryNameInput: HTMLInputElement
    territorySaveButton: HTMLButtonElement
    territoryCloseButton: HTMLButtonElement

    countriesButton: HTMLButtonElement
    territoryCountrySelect: HTMLSelectElement
    countryPanel: HTMLElement
    countryCloseButton: HTMLButtonElement
    countryNameInput: HTMLInputElement
    countryColorInput: HTMLInputElement
    createCountryButton: HTMLButtonElement
    countryList: HTMLElement
    geographyLockButton: HTMLButtonElement

    selectedCountryEditor: HTMLElement

    selectedCountryNameInput: HTMLInputElement
    selectedCountryColorInput: HTMLInputElement

    saveCountryButton: HTMLButtonElement
    assignCountryButton: HTMLButtonElement
    deleteCountryButton: HTMLButtonElement

    exportMapButton: HTMLButtonElement
    importMapButton: HTMLButtonElement
    importMapInput: HTMLInputElement

    referenceMapButton: HTMLButtonElement
    referenceMapInput: HTMLInputElement

    referenceOpacityControl: HTMLLabelElement
    referenceOpacityInput: HTMLInputElement
    referenceOpacityValue: HTMLSpanElement

    detectReferenceBordersButton: HTMLButtonElement
    referenceThresholdControl: HTMLLabelElement
    referenceThresholdInput: HTMLInputElement
    referenceThresholdValue: HTMLSpanElement

    removeReferenceMapButton: HTMLButtonElement

    projectNameInput: HTMLInputElement

    saveLocalProjectButton: HTMLButtonElement
    localProjectsButton: HTMLButtonElement

    localProjectsPanel: HTMLElement
    localProjectsCloseButton: HTMLButtonElement
    localProjectsList: HTMLElement

    newProjectButton: HTMLButtonElement
    projectSaveState: HTMLSpanElement

    territoryDeleteButton: HTMLButtonElement

    timelinePreviousButton: HTMLButtonElement
    timelineYearInput: HTMLInputElement
    timelineNextButton: HTMLButtonElement
    timelineBar: HTMLDivElement

    applyReferenceBordersButton: HTMLButtonElement
}


export function createUI(): EditorUI {

    const app =
        document.querySelector<HTMLDivElement>('#app')

    if (app === null) {
        throw new Error(
            'No se encontró el elemento #app'
        )
    }


    app.innerHTML = `
        <div class="app">

            <header class="toolbar">

                <!-- ==================================================
                    FILA 1: HERRAMIENTAS DEL MAPA
                    ================================================== -->

                <div class="toolbar-row">

                    <div class="toolbar-group">

                        <button
                            id="pencilButton"
                            class="active"
                        >
                            ✏️ Lápiz
                        </button>

                        <button id="eraserButton">
                            🧽 Borrar
                        </button>

                        <button id="territoryButton">
                            🗺️ Territorio
                        </button>

                        <button id="selectButton">
                            🔍 Seleccionar
                        </button>

                        <button id="countriesButton">
                            🏳️ Países
                        </button>

                    </div>


                    <div class="toolbar-separator"></div>


                    <div class="toolbar-group">

                        <label
                            id="eraserSizeControl"
                            class="hidden"
                        >
                            Tamaño goma

                            <select id="eraserSize">
                                <option value="2">
                                    Muy Pequeña
                                </option>    

                                <option value="15">
                                    Pequeña
                                </option>

                                <option value="30" selected>
                                    Mediana
                                </option>

                                <option value="70">
                                    Grande
                                </option>

                                <option value="120">
                                    Muy grande
                                </option>
                            </select>
                        </label>

                    </div>


                    <div class="toolbar-separator"></div>


                    <div class="toolbar-group">

                        <span class="zoom-info">
                            Zoom:
                            <strong id="zoomValue">
                                100%
                            </strong>
                        </span>

                        <button id="resetViewButton">
                            Centrar vista
                        </button>

                    </div>


                    <div class="toolbar-separator"></div>


                    <div class="toolbar-group">

                        <button id="clearButton">
                            Limpiar mapa
                        </button>

                        <button id="geographyLockButton">
                            ✓ Finalizar geografía
                        </button>

                    </div>

                </div>


                <!-- ==================================================
                    FILA 2: PROYECTO / ARCHIVOS
                    ================================================== -->

                <div class="toolbar-row toolbar-project-row">

                    <div class="toolbar-group">

                        <span class="toolbar-label">
                            Proyecto:
                        </span>

                        <input
                            id="projectNameInput"
                            class="project-name-input"
                            type="text"
                            maxlength="100"
                            value="Mi mapa"
                            aria-label="Nombre del mapa"
                        />

                        <span
                            id="projectSaveState"
                            class="project-save-state"
                        >
                            Nuevo
                        </span>

                        <button id="newProjectButton">
                            ＋ Nuevo
                        </button>

                        <button id="saveLocalProjectButton">
                            💾 Guardar
                        </button>

                        <button id="localProjectsButton">
                            📁 Mis mapas
                        </button>

                    </div>


                    <div class="toolbar-separator"></div>


                    <div class="toolbar-group">

                        <button id="exportMapButton">
                            ⬇️ Exportar
                        </button>

                        <button id="importMapButton">
                            ⬆️ Importar
                        </button>

                        <input
                            id="importMapInput"
                            type="file"
                            accept=".json,application/json"
                            hidden
                        />

                    </div>


                    <div class="toolbar-separator"></div>


                    <div class="toolbar-group reference-map-controls">

                        <button
                            id="referenceMapButton"
                            type="button"
                        >
                            🖼️ Referencia
                        </button>

                        <input
                            id="referenceMapInput"
                            type="file"
                            accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                            hidden
                        />

                        <label
                            id="referenceOpacityControl"
                            class="reference-opacity-control"
                        >
                            <span>
                                Opacidad
                            </span>

                            <input
                                id="referenceOpacityInput"
                                type="range"
                                min="0"
                                max="100"
                                step="1"
                                value="60"
                                disabled
                            />

                            <span id="referenceOpacityValue">
                                60%
                            </span>
                        </label>

                        <button
                            id="removeReferenceMapButton"
                            type="button"
                            disabled
                        >
                            Quitar
                        </button>

                        <label
                            id="referenceThresholdControl"
                            class="reference-threshold-control hidden"
                        >
                            <span>
                                Umbral
                            </span>

                            <input
                                id="referenceThresholdInput"
                                type="range"
                                min="0"
                                max="255"
                                step="1"
                                value="160"
                            />

                            <span id="referenceThresholdValue">
                                160
                            </span>
                        </label>

                        <button
                            id="applyReferenceBordersButton"
                            type="button"
                            class="hidden"
                        >
                            Aplicar fronteras
                        </button>

                        <button
                            id="detectReferenceBordersButton"
                            type="button"
                            disabled
                        >
                            Detectar fronteras
                        </button>

                    </div>


                    <div class="toolbar-status">

                        <span
                            id="statusMessage"
                            class="status-message"
                        >
                            Herramienta: Lápiz
                        </span>

                    </div>

                </div>

            </header>


            <div
                id="timelineBar"
                class="timeline-bar hidden"
            >
                <button
                    id="timelinePreviousButton"
                    type="button"
                >
                    ◀
                </button>

                <span>Año</span>

                <input
                    id="timelineYearInput"
                    type="number"
                    value="0"
                    step="1"
                >

                <button
                    id="timelineNextButton"
                    type="button"
                >
                    ▶
                </button>
            </div>


            <main
                id="workspace"
                class="workspace"
            >

                <div
                    id="mapContainer"
                    class="map-container"
                >

                    <canvas
                        id="referenceCanvas"
                        width="${MAP_WIDTH}"
                        height="${MAP_HEIGHT}"
                    ></canvas>

                    <canvas
                        id="territoryCanvas"
                        width="${MAP_WIDTH}"
                        height="${MAP_HEIGHT}"
                    ></canvas>

                    <canvas
                        id="previewCanvas"
                        width="${MAP_WIDTH}"
                        height="${MAP_HEIGHT}"
                    ></canvas>

                    <canvas
                        id="borderCanvas"
                        width="${MAP_WIDTH}"
                        height="${MAP_HEIGHT}"
                    ></canvas>

                    <div
                        id="eraserCursor"
                        class="eraser-cursor hidden"
                    ></div>

                </div>

            </main> 

            <aside
                id="territoryPanel"
                class="territory-panel hidden"
            >
                <div class="territory-panel-header">

                    <strong>
                        Territorio
                    </strong>

                    <button
                        id="territoryCloseButton"
                        class="territory-panel-close"
                        title="Cerrar"
                    >
                        ✕
                    </button>

                </div>

                <div class="territory-field">

                    <label>
                        ID
                    </label>

                    <span id="territoryIdValue">
                        -
                    </span>

                </div>

                <div class="territory-field">

                    <label for="territoryNameInput">
                        Nombre
                    </label>

                    <input
                        id="territoryNameInput"
                        type="text"
                        maxlength="100"
                    />

                </div>

                <div class="territory-field">

                    <label for="territoryCountrySelect">
                        País
                    </label>

                    <select id="territoryCountrySelect">

                        <option value="">
                            Sin país
                        </option>

                    </select>

                </div>

                <button
                    id="territorySaveButton"
                    class="territory-save-button"
                >
                    Guardar nombre
                </button>

                <button
                    id="territoryDivideButton"
                    class="territory-save-button"
                >
                    Dividir territorio
                </button>

                <button
                    id="territoryDeleteButton"
                    class="territory-save-button danger-button"
                >
                    Eliminar territorio
                </button>

            </aside>

            <aside
                id="countryPanel"
                class="country-panel hidden"
            >

                <div class="territory-panel-header">

                    <strong>
                        Países
                    </strong>

                    <button
                        id="countryCloseButton"
                        class="territory-panel-close"
                        title="Cerrar"
                    >
                        ✕
                    </button>

                </div>


                <div class="territory-field">

                    <label for="countryNameInput">
                        Nombre
                    </label>

                    <input
                        id="countryNameInput"
                        type="text"
                        maxlength="100"
                        placeholder="Ej: Reino del Norte"
                    />

                </div>


                <div class="territory-field">

                    <label for="countryColorInput">
                        Color
                    </label>

                    <input
                        id="countryColorInput"
                        type="color"
                        value="#3f7ad6"
                    />

                </div>


                <button
                    id="createCountryButton"
                    class="territory-save-button"
                >
                    Crear país
                </button>


                <div
                    id="countryList"
                    class="country-list"
                ></div>


                <div
                    id="selectedCountryEditor"
                    class="selected-country-editor hidden"
                >

                    <hr />

                    <strong>
                        País seleccionado
                    </strong>


                    <div class="territory-field">

                        <label for="selectedCountryNameInput">
                            Nombre
                        </label>

                        <input
                            id="selectedCountryNameInput"
                            type="text"
                            maxlength="100"
                        />

                    </div>


                    <div class="territory-field">

                        <label for="selectedCountryColorInput">
                            Color
                        </label>

                        <input
                            id="selectedCountryColorInput"
                            type="color"
                        />

                    </div>


                    <button id="saveCountryButton">
                        Guardar cambios
                    </button>


                    <button id="assignCountryButton">
                        Asignar territorios
                    </button>


                    <button
                        id="deleteCountryButton"
                        class="danger-button"
                    >
                        Eliminar país
                    </button>

                </div>

            </aside>

            <aside
                id="localProjectsPanel"
                class="local-projects-panel hidden"
            >

                <div class="territory-panel-header">

                    <strong>
                        Mis mapas
                    </strong>

                    <button
                        id="localProjectsCloseButton"
                        class="territory-panel-close"
                        title="Cerrar"
                    >
                        ✕
                    </button>

                </div>


                <div
                    id="localProjectsList"
                    class="local-projects-list"
                ></div>

            </aside>

        </div>
  `


    return {
        workspace:
            getElement<HTMLElement>(
                '#workspace'
            ),

        mapContainer:
            getElement<HTMLDivElement>(
                '#mapContainer'
            ),

        referenceCanvas:
            getElement<HTMLCanvasElement>(
                '#referenceCanvas'
            ),

        borderCanvas:
            getElement<HTMLCanvasElement>(
                '#borderCanvas'
            ),

        previewCanvas:
            getElement<HTMLCanvasElement>(
                '#previewCanvas'
            ),

        territoryCanvas:
            getElement<HTMLCanvasElement>(
                '#territoryCanvas'
            ),

        pencilButton:
            getElement<HTMLButtonElement>(
                '#pencilButton'
            ),

        eraserButton:
            getElement<HTMLButtonElement>(
                '#eraserButton'
            ),

        territoryButton:
            getElement<HTMLButtonElement>(
                '#territoryButton'
            ),

        selectButton:
            getElement<HTMLButtonElement>(
                '#selectButton'
            ),

        countriesButton:
            getElement<HTMLButtonElement>(
                '#countriesButton'
            ),
        
        territoryCountrySelect:
            getElement<HTMLSelectElement>(
                '#territoryCountrySelect'
            ),

        clearButton:
            getElement<HTMLButtonElement>(
                '#clearButton'
            ),

        geographyLockButton:
            getElement<HTMLButtonElement>(
                '#geographyLockButton'
            ),

        resetViewButton:
            getElement<HTMLButtonElement>(
                '#resetViewButton'
            ),

        eraserSizeControl:
            getElement<HTMLLabelElement>(
                '#eraserSizeControl'
            ),

        eraserSizeSelect:
            getElement<HTMLSelectElement>(
                '#eraserSize'
            ),

        eraserCursor:
            getElement<HTMLDivElement>(
                '#eraserCursor'
            ),

        zoomValue:
            getElement<HTMLSpanElement>(
                '#zoomValue'
            ),

        statusMessage:
            getElement<HTMLSpanElement>(
                '#statusMessage'
            ),

        territoryPanel:
            getElement<HTMLElement>(
                '#territoryPanel'
            ),

        territoryIdValue:
            getElement<HTMLSpanElement>(
                '#territoryIdValue'
            ),

        territoryNameInput:
            getElement<HTMLInputElement>(
                '#territoryNameInput'
            ),

        territorySaveButton:
            getElement<HTMLButtonElement>(
                '#territorySaveButton'
            ),

        territoryCloseButton:
            getElement<HTMLButtonElement>(
                '#territoryCloseButton'
            ),

        countryPanel:
            getElement<HTMLElement>(
                '#countryPanel'
            ),

        countryCloseButton:
            getElement<HTMLButtonElement>(
                '#countryCloseButton'
            ),

        countryNameInput:
            getElement<HTMLInputElement>(
                '#countryNameInput'
            ),

        countryColorInput:
            getElement<HTMLInputElement>(
                '#countryColorInput'
            ),

        createCountryButton:
            getElement<HTMLButtonElement>(
                '#createCountryButton'
            ),

        countryList:
            getElement<HTMLElement>(
                '#countryList'
            ),
        
        selectedCountryEditor:
            getElement<HTMLElement>(
                '#selectedCountryEditor'
            ),

        selectedCountryNameInput:
            getElement<HTMLInputElement>(
                '#selectedCountryNameInput'
            ),

        selectedCountryColorInput:
            getElement<HTMLInputElement>(
                '#selectedCountryColorInput'
            ),

        saveCountryButton:
            getElement<HTMLButtonElement>(
                '#saveCountryButton'
            ),

        assignCountryButton:
            getElement<HTMLButtonElement>(
                '#assignCountryButton'
            ),

        deleteCountryButton:
            getElement<HTMLButtonElement>(
                '#deleteCountryButton'
            ),
        
        exportMapButton:
            getElement<HTMLButtonElement>(
                '#exportMapButton'
            ),

        importMapButton:
            getElement<HTMLButtonElement>(
                '#importMapButton'
            ),

        importMapInput:
            getElement<HTMLInputElement>(
                '#importMapInput'
            ),

        referenceMapButton:
            getElement<HTMLButtonElement>(
                '#referenceMapButton'
            ),

        referenceMapInput:
            getElement<HTMLInputElement>(
                '#referenceMapInput'
            ),

        referenceOpacityControl:
            getElement<HTMLLabelElement>(
                '#referenceOpacityControl'
            ),

        referenceOpacityInput:
            getElement<HTMLInputElement>(
                '#referenceOpacityInput'
            ),

        referenceOpacityValue:
            getElement<HTMLSpanElement>(
                '#referenceOpacityValue'
            ),

        removeReferenceMapButton:
            getElement<HTMLButtonElement>(
                '#removeReferenceMapButton'
            ),
        
        projectNameInput:
            getElement<HTMLInputElement>(
                '#projectNameInput'
            ),

        saveLocalProjectButton:
            getElement<HTMLButtonElement>(
                '#saveLocalProjectButton'
            ),

        localProjectsButton:
            getElement<HTMLButtonElement>(
                '#localProjectsButton'
            ),

        localProjectsPanel:
            getElement<HTMLElement>(
                '#localProjectsPanel'
            ),

        localProjectsCloseButton:
            getElement<HTMLButtonElement>(
                '#localProjectsCloseButton'
            ),

        localProjectsList:
            getElement<HTMLElement>(
                '#localProjectsList'
            ),

        newProjectButton:
            getElement<HTMLButtonElement>(
                '#newProjectButton'
            ),

        projectSaveState:
            getElement<HTMLSpanElement>(
                '#projectSaveState'
            ),

        territoryDeleteButton:
            getElement<HTMLButtonElement>(
                '#territoryDeleteButton'
            ),

        territoryDivideButton:
            getElement<HTMLButtonElement>(
                '#territoryDivideButton'
            ),

        timelinePreviousButton:
            getElement<HTMLButtonElement>(
                '#timelinePreviousButton'
            ),

        timelineYearInput:
            getElement<HTMLInputElement>(
                '#timelineYearInput'
            ),

        timelineNextButton:
            getElement<HTMLButtonElement>(
                '#timelineNextButton'
            ),

        timelineBar:
            getElement<HTMLDivElement>(
                '#timelineBar'
            ),

        detectReferenceBordersButton:
            getElement<HTMLButtonElement>(
                '#detectReferenceBordersButton'
            ),

        referenceThresholdControl:
            getElement<HTMLLabelElement>(
                '#referenceThresholdControl'
            ),

        referenceThresholdInput:
            getElement<HTMLInputElement>(
                '#referenceThresholdInput'
            ),

        referenceThresholdValue:
            getElement<HTMLSpanElement>(
                '#referenceThresholdValue'
            ),

        applyReferenceBordersButton:
            getElement<HTMLButtonElement>(
                '#applyReferenceBordersButton'
            ),
    }
}


function getElement<T extends Element>(
    selector: string
): T {

    const element =
        document.querySelector<T>(
            selector
        )

    if (element === null) {
        throw new Error(
            `No se encontró el elemento ${selector}`
        )
    }

    return element
}
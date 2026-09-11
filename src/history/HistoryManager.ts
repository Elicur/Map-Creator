import type {
    HistoryCommand,
} from '../types/editor'


export class HistoryManager {

    private history: HistoryCommand[] = []
    private redoHistory: HistoryCommand[] = []


    // --------------------------------------------------
    // AGREGAR ACCIÓN
    // --------------------------------------------------

    public push(
        command: HistoryCommand
    ) {
        this.history.push(
            command
        )

        /*
         * Si hacemos una acción nueva después
         * de haber usado Undo, ya no podemos
         * rehacer las acciones anteriores.
         */
        this.redoHistory = []
    }


    // --------------------------------------------------
    // UNDO
    // --------------------------------------------------

    public undo(): HistoryCommand | null {

        const command =
            this.history.pop()


        if (command === undefined) {
            return null
        }


        this.redoHistory.push(
            command
        )


        return command
    }


    // --------------------------------------------------
    // REDO
    // --------------------------------------------------

    public redo(): HistoryCommand | null {

        const command =
            this.redoHistory.pop()


        if (command === undefined) {
            return null
        }


        this.history.push(
            command
        )


        return command
    }


    // --------------------------------------------------
    // COMANDOS ACTIVOS
    // --------------------------------------------------

    public get commands(): readonly HistoryCommand[] {

        return this.history
    }


    // --------------------------------------------------
    // ESTADO
    // --------------------------------------------------

    public get canUndo(): boolean {

        return (
            this.history.length > 0
        )
    }


    public get canRedo(): boolean {

        return (
            this.redoHistory.length > 0
        )
    }


    // --------------------------------------------------
    // RESET COMPLETO
    // --------------------------------------------------

    public reset() {

        this.history = []
        this.redoHistory = []
    }


    public peekUndo(): HistoryCommand | null {

        return (
            this.history[
                this.history.length - 1
            ]
            ?? null
        )
    }


    public peekRedo(): HistoryCommand | null {

        return (
            this.redoHistory[
                this.redoHistory.length - 1
            ]
            ?? null
        )
    }
}
import type {
    Country,
} from '../types/editor'


export class CountryManager {

    private countries =
        new Map<number, Country>()

    private nextCountryId = 1


    // --------------------------------------------------
    // CREAR
    // --------------------------------------------------

    public create(
        name: string,
        color: string
    ): Country | null {

        const cleanName =
            name.trim()


        if (cleanName.length === 0) {
            return null
        }


        const country: Country = {
            id: this.nextCountryId++,
            name: cleanName,
            color,
        }


        this.countries.set(
            country.id,
            country
        )


        return country
    }


    // --------------------------------------------------
    // ACTUALIZAR
    // --------------------------------------------------

    public update(
        countryId: number,
        name: string,
        color: string
    ): Country | null {

        const country =
            this.countries.get(
                countryId
            )


        if (country === undefined) {
            return null
        }


        const cleanName =
            name.trim()


        if (cleanName.length === 0) {
            return null
        }


        country.name =
            cleanName

        country.color =
            color


        return country
    }


    // --------------------------------------------------
    // ELIMINAR
    // --------------------------------------------------

    public delete(
        countryId: number
    ): boolean {

        return this.countries.delete(
            countryId
        )
    }

    // --------------------------------------------------
    // RECREAR DESDE HISTORIAL
    // --------------------------------------------------

    public recreate(
        countryId: number,
        name: string,
        color: string
    ): Country {

        const country: Country = {
            id: countryId,
            name,
            color,
        }


        this.countries.set(
            countryId,
            country
        )


        this.nextCountryId =
            Math.max(
                this.nextCountryId,
                countryId + 1
            )


        return country
    }


    // --------------------------------------------------
    // OBTENER POR ID
    // --------------------------------------------------

    public getById(
        countryId: number
    ): Country | null {

        return (
            this.countries.get(
                countryId
            )
            ?? null
        )
    }


    // --------------------------------------------------
    // TODOS
    // --------------------------------------------------

    public getAll(): Country[] {

        return Array.from(
            this.countries.values()
        )
    }


    // --------------------------------------------------
    // RESET
    // --------------------------------------------------

    public reset() {

        this.countries.clear()

        this.nextCountryId = 1
    }
}
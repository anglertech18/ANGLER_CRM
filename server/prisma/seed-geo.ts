import { PrismaClient } from '@prisma/client';
import { Country, State, City } from 'country-state-city';

const prisma = new PrismaClient({
    log: ['error', 'warn'],
});

const CHUNK_SIZE = 1000;

async function createManyChunked(
    model: { createMany: (args: any) => Promise<any> },
    rows: Record<string, any>[]
) {
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
        const chunk = rows.slice(i, i + CHUNK_SIZE);
        await model.createMany({ data: chunk, skipDuplicates: true });
    }
}

async function importCountry(countryData: { name: string; isoCode: string }) {
    const country = await prisma.country.upsert({
        where: { name: countryData.name },
        update: {},
        create: { name: countryData.name, is_active: true },
    });

    const statesData = State.getStatesOfCountry(countryData.isoCode);

    const existingStates = await prisma.state.findMany({
        where: { country_id: country.id },
        select: { id: true, name: true },
    });
    const stateNameToId = new Map<string, number>(existingStates.map(s => [s.name, s.id]));

    const newStateNames = new Set<string>();
    for (const s of statesData) {
        if (!stateNameToId.has(s.name)) {
            newStateNames.add(s.name);
        }
    }

    if (newStateNames.size > 0) {
        const rows = Array.from(newStateNames).map(name => ({
            name,
            country_id: country.id,
            is_active: true,
        }));
        await createManyChunked(prisma.state, rows);

        const refreshed = await prisma.state.findMany({
            where: { country_id: country.id, name: { in: Array.from(newStateNames) } },
            select: { id: true, name: true },
        });
        for (const r of refreshed) stateNameToId.set(r.name, r.id);
    }

    let citiesCountForCountry = 0;

    for (const s of statesData) {
        const stateId = stateNameToId.get(s.name);
        if (!stateId) continue;

        const citiesData = City.getCitiesOfState(countryData.isoCode, s.isoCode);
        if (citiesData.length === 0) continue;

        citiesCountForCountry += citiesData.length;

        const existingCities = await prisma.city.findMany({
            where: { state_id: stateId },
            select: { name: true },
        });
        const existingCityNames = new Set(existingCities.map(c => c.name));

        const seen = new Set<string>();
        const newCityRows: { name: string; state_id: number; is_active: boolean }[] = [];
        for (const c of citiesData) {
            if (!existingCityNames.has(c.name) && !seen.has(c.name)) {
                seen.add(c.name);
                newCityRows.push({ name: c.name, state_id: stateId, is_active: true });
            }
        }

        if (newCityRows.length > 0) {
            await createManyChunked(prisma.city, newCityRows);
        }
    }

    return { statesCount: statesData.length, citiesCount: citiesCountForCountry };
}

async function main() {
    console.log('Importing Countries...\n');

    let totalCountries = 0;
    let totalStates = 0;
    let totalCities = 0;

    const allCountries = Country.getAllCountries();

    for (const countryData of allCountries) {
        try {
            const { statesCount, citiesCount } = await importCountry(countryData);
            totalCountries++;
            totalStates += statesCount;
            totalCities += citiesCount;

            console.log(`${countryData.name} ✔`);
            console.log(`States : ${statesCount}`);
            console.log(`Cities : ${citiesCount}\n`);
        } catch (err) {
            console.error(`Failed importing country ${countryData.name}:`, err);
        }
    }

    console.log('--------------------------------');
    console.log(`Countries Imported : ${totalCountries}`);
    console.log(`States Imported : ${totalStates}`);
    console.log(`Cities Imported : ${totalCities}`);
    console.log('Completed Successfully');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

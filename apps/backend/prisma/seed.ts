import { PrismaClient } from '@prisma/client';
import { ALL_LINES } from '@movia/shared-data/network/lines/index';
import { STATIONS }  from '@movia/shared-data/network/stations';
import { TRANSFERS } from '@movia/shared-data/network/transfers';

const prisma = new PrismaClient();

if (process.env.NODE_ENV === 'production') {
  throw new Error('Seed bloqueado em producao. Execute apenas em desenvolvimento.');
}

async function main() {
  console.log('Iniciando Data Seed Pipeline...');

  const lines        = ALL_LINES.map(d => d.line);
  const platforms    = ALL_LINES.flatMap(d => d.platforms);
  const segments     = ALL_LINES.flatMap(d => d.segments);
  const timeProfiles = ALL_LINES.flatMap(d =>
    d.segments.flatMap(seg =>
      seg.timeProfiles.map(tp => ({ ...tp, segmentId: seg.id }))
    )
  );
  const stations  = STATIONS.map(({ entrances: _, ...s }) => s);
  const entrances = STATIONS.flatMap(s =>
    s.entrances.map(e => ({ ...e, stationId: s.id }))
  );

  console.log(`Linhas: ${lines.length} | Estacoes: ${stations.length} | Plataformas: ${platforms.length}`);
  console.log(`Segmentos: ${segments.length} | Baldeacoes: ${TRANSFERS.length} | TimeProfiles: ${timeProfiles.length}`);

  await prisma.$transaction(async (tx) => {

    console.log('Fase 0: TRUNCATE CASCADE...');
    await tx.$executeRaw`TRUNCATE TABLE segment_time_profiles, internal_transfers, track_segments, station_entrances, platforms, stations, lines CASCADE`;

    console.log('Fase 1: Lines + Stations...');
    await tx.line.createMany({ data: lines });
    await tx.station.createMany({ data: stations });

    console.log('Fase 2: Platforms + Entrances...');
    await tx.platform.createMany({ data: platforms });
    if (entrances.length > 0) {
      await tx.stationEntrance.createMany({ data: entrances });
    }

    console.log('Fase 3: TrackSegments + InternalTransfers...');
    await tx.trackSegment.createMany({
      data: segments.map(({ timeProfiles: _, ...s }) => s),
    });
    await tx.internalTransfer.createMany({ data: TRANSFERS });

    console.log('Fase 4: SegmentTimeProfiles...');
    await tx.segmentTimeProfile.createMany({ data: timeProfiles });

  }, { timeout: 60_000 });

  console.log(`Seed finalizado — ${lines.length} linhas, ${stations.length} estacoes, ${segments.length} segmentos, ${timeProfiles.length} perfis temporais`);
}

main()
  .catch((e) => {
    console.error('Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => await prisma.$disconnect());
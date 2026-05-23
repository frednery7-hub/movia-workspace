const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log('⏳ Injetando dados do Metrô no banco...');
  try {
    await prisma.line.create({
      data: {
        name: 'L1',
        color: '#E31837',
        stations: {
          create: [
            { name: 'San Pablo', lat: -33.4435, lng: -70.7225 },
            { name: 'Baquedano', lat: -33.4372, lng: -70.6344 },
            { name: 'Los Dominicos', lat: -33.4075, lng: -70.5447 }
          ]
        }
      }
    });
    console.log('✅ L1 Criada com sucesso!');
  } catch (e) {
    console.log('⚠️ A linha já estava lá (ou houve um pequeno desvio).');
  }
  
  const linhas = await prisma.line.findMany({ include: { stations: true } });
  console.log('📊 DADOS REAIS NO BANCO AGORA:');
  console.log(JSON.stringify(linhas, null, 2));
}

run().finally(() => prisma.$disconnect());

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkEnums() {
  const rs = await prisma.$queryRaw`SELECT enumtype.typname, enumlabel FROM pg_enum JOIN pg_type enumtype ON pg_enum.enumtypid = enumtype.oid WHERE enumtype.typname IN ('TipoMiembro', 'AreaRepresentacion')`;
  console.log(rs);
}

checkEnums()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

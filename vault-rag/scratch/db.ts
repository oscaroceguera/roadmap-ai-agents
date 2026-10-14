import { prisma } from "../src/db";

console.log(await prisma.$queryRaw`select current_database() as db, 1 as ok`);

await prisma.$disconnect();

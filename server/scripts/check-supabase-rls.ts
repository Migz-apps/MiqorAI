import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type RlsRow = {
  tablename: string;
  rowsecurity: boolean;
};

async function main() {
  const rows = await prisma.$queryRaw<RlsRow[]>`
    select
      c.relname as tablename,
      c.relrowsecurity as rowsecurity
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
    order by c.relname
  `;

  const disabled = rows.filter((row) => !row.rowsecurity);

  console.log(JSON.stringify({
    total_tables: rows.length,
    rls_enabled_tables: rows.length - disabled.length,
    disabled_tables: disabled.map((row) => row.tablename),
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

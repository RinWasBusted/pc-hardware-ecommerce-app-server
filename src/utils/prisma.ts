import { PrismaClient, Prisma } from "../generated/prisma/index.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import 'dotenv/config'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Export thêm Prisma để dùng cho việc bắt lỗi (Error Handling) ở các file khác
export { prisma, Prisma };
export default prisma;

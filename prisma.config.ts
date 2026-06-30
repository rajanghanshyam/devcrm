import { defineConfig } from "@prisma/config";
import dotenv from "dotenv";

const result = dotenv.config();

console.log(result);

console.log("DATABASE_URL =", process.env.DATABASE_URL);

export default defineConfig({
    schema: "./prisma/schema.prisma",
    datasource: {
        url: process.env.DATABASE_URL,
    },
});
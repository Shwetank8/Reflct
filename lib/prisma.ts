import { PrismaClient } from "./generated/prisma";

declare global {
  var prisma: PrismaClient | undefined
}



export const db = globalThis.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
    globalThis.prisma = db
}


// globalThis.prisma: this global variable ensures that the prisma client instance is
// reused across hot reloads during PHASE_DEVELOPMENT_SERVER. Without this, each time your application
// REACT_LOADABLE_MANIFEST, a new instance will be createDecipheriv, potentially leading to 
// connection issues
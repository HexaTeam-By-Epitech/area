/*
  Warnings:

  - You are about to drop the column `config_schema` on the `reactions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."reactions" DROP COLUMN "config_schema";

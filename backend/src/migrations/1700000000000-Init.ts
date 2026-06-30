import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1700000000000 implements MigrationInterface {
  name = 'Init1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "agencies" ("id" SERIAL NOT NULL, "name" character varying(255) NOT NULL, "abbreviation" character varying(50) NOT NULL, "toptierCode" character varying(10) NOT NULL, CONSTRAINT "UQ_2b60f10f5a93b754b653c8e840d" UNIQUE ("toptierCode"), CONSTRAINT "PK_2b60f10f5a93b754b653c8e840d" PRIMARY KEY ("id"))`,
    );

    await queryRunner.query(
      `CREATE TABLE "spending_records" ("id" SERIAL NOT NULL, "agencyId" integer NOT NULL, "fiscalYear" integer NOT NULL, "quarter" integer NOT NULL, "awardTypeLabel" character varying(255) NOT NULL, "awardTypeCodes" text NOT NULL, "obligatedAmount" integer NOT NULL, "outlayAmount" integer NOT NULL, "awardCount" integer NOT NULL, CONSTRAINT "UQ_0a01b7d816b41b5d2c4f9e8b0c3" UNIQUE ("agencyId", "fiscalYear", "quarter", "awardTypeLabel"), CONSTRAINT "PK_c6c5429d0b866b2f9b8b7f6e7d8" PRIMARY KEY ("id"))`,
    );

    await queryRunner.query(
      `CREATE TABLE "disaster_funding_records" ("id" SERIAL NOT NULL, "defGroup" character varying(255) NOT NULL, "defCodes" text NOT NULL, "stateCode" character varying(2) NOT NULL, "stateName" character varying(255) NOT NULL, "obligatedAmount" integer NOT NULL, "awardCount" integer NOT NULL, "perCapita" integer NOT NULL, "population" integer NOT NULL, CONSTRAINT "UQ_3e4f5a6b7c8d9e0f1a2b3c4d" UNIQUE ("defGroup", "stateCode"), CONSTRAINT "PK_3e4f5a6b7c8d9e0f1a2b3c4d" PRIMARY KEY ("id"))`,
    );

    await queryRunner.query(
      `CREATE TABLE "disaster_recovery_ratios" ("id" SERIAL NOT NULL, "stateCode" character varying(2) NOT NULL, "stateName" character varying(255) NOT NULL, "fiscalYear" integer NOT NULL, "femaObligated" integer NOT NULL, "fedSpendingObligated" integer NOT NULL, "declarationCount" integer NOT NULL, "recoveryRatio" double precision NOT NULL, "dominantIncidentType" character varying(255) NOT NULL, CONSTRAINT "PK_9f0e1d2c3b4a5968776655" PRIMARY KEY ("id"))`,
    );

    await queryRunner.query(
      `CREATE TABLE "geo_spending_snapshots" ("id" SERIAL NOT NULL, "stateCode" character varying(2) NOT NULL, "stateName" character varying(255) NOT NULL, "fiscalYear" integer NOT NULL, "agencyId" integer, "scope" character varying(255) NOT NULL, "obligatedAmount" integer NOT NULL, "awardCount" integer NOT NULL, "population" integer NOT NULL, "perCapita" integer NOT NULL, CONSTRAINT "UQ_1a2b3c4d5e6f7a8b9c0d1e2f" UNIQUE ("stateCode", "fiscalYear", "agencyId", "scope"), CONSTRAINT "PK_1a2b3c4d5e6f7a8b9c0d1e2f" PRIMARY KEY ("id"))`,
    );

    await queryRunner.query(
      `ALTER TABLE "spending_records" ADD CONSTRAINT "FK_spending_agency" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "geo_spending_snapshots" ADD CONSTRAINT "FK_geo_agency" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "geo_spending_snapshots" DROP CONSTRAINT IF EXISTS "FK_geo_agency"`);
    await queryRunner.query(`ALTER TABLE "spending_records" DROP CONSTRAINT IF EXISTS "FK_spending_agency"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "geo_spending_snapshots"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "disaster_recovery_ratios"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "disaster_funding_records"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "spending_records"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "agencies"`);
  }
}

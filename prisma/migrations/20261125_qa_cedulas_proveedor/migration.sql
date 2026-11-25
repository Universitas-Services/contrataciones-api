-- La cédula se guardaba como entero y perdía la letra (V/E). Las ya guardadas quedan sin letra.
ALTER TABLE "Proveedor"
  ALTER COLUMN "cedula_natural_proveedor" TYPE VARCHAR(20) USING "cedula_natural_proveedor"::text,
  ALTER COLUMN "cedula_autoridad_proveedor" TYPE VARCHAR(20) USING "cedula_autoridad_proveedor"::text;

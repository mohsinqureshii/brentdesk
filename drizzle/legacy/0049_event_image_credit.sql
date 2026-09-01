-- Attribution for automatically sourced event photography.
-- Wikimedia Commons images are free to use but most licences REQUIRE
-- credit, so the credit line and source page travel with the URL.
-- Additive only — safe for the startup additive-tail reconciler.
ALTER TABLE `events`
  ADD COLUMN `featuredImageCredit` varchar(512),
  ADD COLUMN `featuredImageSource` text,
  ADD COLUMN `featuredImageLicense` varchar(128);

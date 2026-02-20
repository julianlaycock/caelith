-- SFDR Classification (Regulation (EU) 2019/2088)
-- Every AIFM must classify funds under SFDR Art 6, Art 8, or Art 9.
-- This is mandatory for all EU-domiciled funds and EU-marketed funds.

ALTER TABLE fund_structures ADD COLUMN IF NOT EXISTS sfdr_classification VARCHAR(20) DEFAULT 'not_classified';
-- Valid values: 'article_6', 'article_8', 'article_9', 'not_classified'
-- article_6: No sustainability integration (default disclosure obligations)
-- article_8: Promotes environmental/social characteristics (light green)
-- article_9: Sustainable investment objective (dark green)
-- not_classified: Not yet classified (pre-launch or non-EU funds)

COMMENT ON COLUMN fund_structures.sfdr_classification IS
  'SFDR classification per Regulation (EU) 2019/2088: article_6 | article_8 | article_9 | not_classified';

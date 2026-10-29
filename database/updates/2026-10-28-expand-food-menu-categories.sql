-- Run manually after clearing a failed seed transaction with ROLLBACK if necessary.
-- Existing rows are preserved; this expands the original category vocabulary.
BEGIN;
ALTER TABLE food_menu_items DROP CONSTRAINT IF EXISTS food_menu_items_category_check;
ALTER TABLE food_menu_items ADD CONSTRAINT food_menu_items_category_check
  CHECK (category IN ('RICE','NOODLES','SOUP','CURRY','STIR_FRY','GRILL','SALAD','SEAFOOD','SNACK','DESSERT','BAKERY','FAST_FOOD','DRINK'));
COMMIT;

-- One site-wide choice. An empty table uses the application's Google Sans default.
CREATE TABLE IF NOT EXISTS site_appearance (
  id smallint PRIMARY KEY CHECK (id = 1),
  khmer_font varchar(20) NOT NULL CHECK (khmer_font IN ('google-sans', 'hanuman'))
);

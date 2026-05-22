-- Reference data: 22 courses (exam spec)
INSERT INTO courses (code, name, credits, max_students, preparatory_code) VALUES
  ('02GOLOV', 'Architetture dei sistemi di elaborazione', 12, NULL, NULL),
  ('02LSEOV', 'Computer architectures', 12, NULL, NULL),
  ('01SQJOV', 'Data Science and Database Technology', 8, NULL, NULL),
  ('01SQMOV', 'Data Science e Tecnologie per le Basi di Dati', 8, NULL, NULL),
  ('01SQLOV', 'Database systems', 8, NULL, NULL),
  ('01OTWOV', 'Computer network technologies and services', 6, 3, NULL),
  ('02KPNOV', 'Tecnologie e servizi di rete', 6, 3, NULL),
  ('01TYMOV', 'Information systems security services', 12, NULL, NULL),
  ('01UDUOV', 'Sicurezza dei sistemi informativi', 12, NULL, NULL),
  ('05BIDOV', 'Ingegneria del software', 6, NULL, '02GOLOV'),
  ('04GSPOV', 'Software engineering', 6, NULL, '02LSEOV'),
  ('01UDFOV', 'Applicazioni Web I', 6, NULL, NULL),
  ('01TXYOV', 'Web Applications I', 6, 3, NULL),
  ('01TXSOV', 'Web Applications II', 6, NULL, '01TXYOV'),
  ('02GRSOV', 'Programmazione di sistema', 6, NULL, NULL),
  ('01NYHOV', 'System and device programming', 6, 3, NULL),
  ('01SQOOV', 'Reti Locali e Data Center', 6, NULL, NULL),
  ('01TYDOV', 'Software networking', 7, NULL, NULL),
  ('03UEWOV', 'Challenge', 5, NULL, NULL),
  ('01URROV', 'Computational intelligence', 6, NULL, NULL),
  ('01OUZPD', 'Model based software design', 4, NULL, NULL),
  ('01URSPD', 'Internet Video Streaming', 6, 2, NULL);

-- Incompatibilities (both directions)
INSERT INTO incompatibilities (course_code, incompatible_with) VALUES
  ('02GOLOV', '02LSEOV'),
  ('02LSEOV', '02GOLOV'),
  ('01SQJOV', '01SQMOV'),
  ('01SQJOV', '01SQLOV'),
  ('01SQMOV', '01SQJOV'),
  ('01SQMOV', '01SQLOV'),
  ('01SQLOV', '01SQJOV'),
  ('01SQLOV', '01SQMOV'),
  ('01OTWOV', '02KPNOV'),
  ('02KPNOV', '01OTWOV'),
  ('01TYMOV', '01UDUOV'),
  ('01UDUOV', '01TYMOV'),
  ('05BIDOV', '04GSPOV'),
  ('04GSPOV', '05BIDOV'),
  ('01UDFOV', '01TXYOV'),
  ('01TXYOV', '01UDFOV');

-- Users: password for all is "password" (bcrypt, 10 rounds)
INSERT INTO users (username, password_hash) VALUES
  ('alice', '$2b$10$f73UNnZMlOR.YH3ucFclCu7eAvrKtDml8xtEKsEJWGAa4JVxGroJ.'),
  ('bob', '$2b$10$f73UNnZMlOR.YH3ucFclCu7eAvrKtDml8xtEKsEJWGAa4JVxGroJ.'),
  ('carol', '$2b$10$f73UNnZMlOR.YH3ucFclCu7eAvrKtDml8xtEKsEJWGAa4JVxGroJ.'),
  ('dave', '$2b$10$f73UNnZMlOR.YH3ucFclCu7eAvrKtDml8xtEKsEJWGAa4JVxGroJ.'),
  ('eve', '$2b$10$f73UNnZMlOR.YH3ucFclCu7eAvrKtDml8xtEKsEJWGAa4JVxGroJ.');

-- Study plans: alice full (72 CFU), bob part (24 CFU), carol/dave/eve for enrollment caps
INSERT INTO study_plans (user_id, mode) VALUES
  (1, 'full'),
  (2, 'part'),
  (3, 'full'),
  (4, 'part'),
  (5, 'full');

-- alice: full-time 72 credits (60-80), constraints satisfied
INSERT INTO study_plan_courses (plan_id, course_code) VALUES
  (1, '02GOLOV'),
  (1, '05BIDOV'),
  (1, '01SQOOV'),
  (1, '01TYDOV'),
  (1, '03UEWOV'),
  (1, '01URROV'),
  (1, '01OUZPD'),
  (1, '01SQJOV'),
  (1, '02GRSOV'),
  (1, '01TYMOV');

-- bob: part-time 24 credits (20-40)
INSERT INTO study_plan_courses (plan_id, course_code) VALUES
  (2, '01OTWOV'),
  (2, '01SQLOV'),
  (2, '01UDFOV'),
  (2, '01OUZPD');

-- carol: full-time plan including 01TXYOV (cap filler 1/3)
INSERT INTO study_plan_courses (plan_id, course_code) VALUES
  (3, '02LSEOV'),
  (3, '04GSPOV'),
  (3, '01TXYOV'),
  (3, '01SQOOV'),
  (3, '01TYDOV'),
  (3, '03UEWOV'),
  (3, '01URROV'),
  (3, '01OUZPD'),
  (3, '01SQMOV');

-- dave: part-time with 01TXYOV + 01URSPD (caps 2/3 and 1/2)
INSERT INTO study_plan_courses (plan_id, course_code) VALUES
  (4, '01TXYOV'),
  (4, '01URSPD'),
  (4, '01OTWOV'),
  (4, '01SQLOV');

-- eve: full-time 66 credits; 01TXYOV 3/3 and 01URSPD 2/2 enrollment caps
INSERT INTO study_plan_courses (plan_id, course_code) VALUES
  (5, '01TXYOV'),
  (5, '01URSPD'),
  (5, '02GOLOV'),
  (5, '05BIDOV'),
  (5, '01SQOOV'),
  (5, '01TYDOV'),
  (5, '03UEWOV'),
  (5, '01URROV'),
  (5, '01OUZPD'),
  (5, '01SQJOV');

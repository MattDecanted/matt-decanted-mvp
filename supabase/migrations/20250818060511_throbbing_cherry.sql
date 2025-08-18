/*
# Seed Data

1. Content Creation
  - 7 trial quizzes for the week
  - 6 guess what items with progressive clues
  - 3 video shorts with placeholder content
  - 6 quiz questions for shorts

2. Data Quality
  - Realistic quiz questions with varied difficulty
  - Progressive clue structures for guess what
  - Proper point allocations
*/

-- Seed trial quizzes (7 days)
INSERT INTO trial_quizzes (locale, for_date, title, questions, points_award, is_published) VALUES
('en', CURRENT_DATE, 'Daily Brain Teaser', '[
  {"question": "What has keys but no locks, space but no room?", "options": ["Piano", "Computer", "Map", "Book"], "correct": 0},
  {"question": "Which planet is closest to the Sun?", "options": ["Venus", "Mercury", "Earth", "Mars"], "correct": 1},
  {"question": "What is the capital of Australia?", "options": ["Sydney", "Melbourne", "Canberra", "Perth"], "correct": 2}
]', 15, true),

('en', CURRENT_DATE + INTERVAL '1 day', 'Science & Nature', '[
  {"question": "How many chambers does a human heart have?", "options": ["Two", "Three", "Four", "Five"], "correct": 2},
  {"question": "What is the largest mammal in the world?", "options": ["Elephant", "Blue Whale", "Giraffe", "Hippopotamus"], "correct": 1},
  {"question": "Which gas makes up most of Earth''s atmosphere?", "options": ["Oxygen", "Carbon Dioxide", "Nitrogen", "Hydrogen"], "correct": 2}
]', 15, true),

('en', CURRENT_DATE + INTERVAL '2 days', 'History & Culture', '[
  {"question": "In which year did World War II end?", "options": ["1944", "1945", "1946", "1947"], "correct": 1},
  {"question": "Who painted the Mona Lisa?", "options": ["Vincent van Gogh", "Pablo Picasso", "Leonardo da Vinci", "Michelangelo"], "correct": 2},
  {"question": "Which ancient wonder was located in Alexandria?", "options": ["Colossus", "Lighthouse", "Hanging Gardens", "Temple"], "correct": 1}
]', 15, true),

('en', CURRENT_DATE + INTERVAL '3 days', 'Math & Logic', '[
  {"question": "What is 15% of 200?", "options": ["25", "30", "35", "40"], "correct": 1},
  {"question": "Which number comes next: 2, 6, 12, 20, ?", "options": ["28", "30", "32", "36"], "correct": 1},
  {"question": "How many sides does a hexagon have?", "options": ["Five", "Six", "Seven", "Eight"], "correct": 1}
]', 15, true),

('en', CURRENT_DATE + INTERVAL '4 days', 'Geography', '[
  {"question": "Which is the longest river in the world?", "options": ["Amazon", "Nile", "Mississippi", "Yangtze"], "correct": 1},
  {"question": "Mount Everest is located in which mountain range?", "options": ["Alps", "Andes", "Rockies", "Himalayas"], "correct": 3},
  {"question": "Which country has the most time zones?", "options": ["Russia", "USA", "China", "Canada"], "correct": 0}
]', 15, true),

('en', CURRENT_DATE + INTERVAL '5 days', 'Technology', '[
  {"question": "What does CPU stand for?", "options": ["Computer Processing Unit", "Central Processing Unit", "Central Program Unit", "Computer Program Unit"], "correct": 1},
  {"question": "Which company created the iPhone?", "options": ["Google", "Microsoft", "Apple", "Samsung"], "correct": 2},
  {"question": "What does WWW stand for?", "options": ["World Wide Web", "World Wide Work", "World Web Works", "Wide World Web"], "correct": 0}
]', 15, true),

('en', CURRENT_DATE + INTERVAL '6 days', 'Mixed Knowledge', '[
  {"question": "What is the chemical symbol for gold?", "options": ["Go", "Gd", "Au", "Ag"], "correct": 2},
  {"question": "Which Shakespeare play features Romeo and Juliet?", "options": ["Hamlet", "Romeo and Juliet", "Macbeth", "Othello"], "correct": 1},
  {"question": "How many minutes are in a full day?", "options": ["1440", "1340", "1540", "1240"], "correct": 0}
]', 15, true);

-- Seed guess what items
INSERT INTO guess_what_items (locale, title, clues, is_active) VALUES
('en', 'Smartphone', ARRAY[
  'It fits in your pocket',
  'It has a touchscreen',
  'You can make calls with it',
  'It can connect to the internet',
  'It has apps for everything'
], true),

('en', 'Pizza', ARRAY[
  'It''s round and flat',
  'It''s often cut into triangular pieces',
  'It has cheese on top',
  'It originated in Italy',
  'It''s baked in an oven'
], true),

('en', 'Bicycle', ARRAY[
  'It has two wheels',
  'You use your legs to power it',
  'It has handlebars for steering',
  'It''s an eco-friendly transport',
  'It has pedals and a chain'
], true),

('en', 'Coffee', ARRAY[
  'It''s a dark liquid',
  'It''s made from beans',
  'It contains caffeine',
  'People drink it in the morning',
  'It''s often served hot'
], true),

('en', 'Library', ARRAY[
  'It''s a quiet place',
  'It''s full of knowledge',
  'You can borrow things here',
  'It has rows of shelves',
  'It''s filled with books'
], true),

('en', 'Rainbow', ARRAY[
  'You see it after rain',
  'It has multiple colors',
  'It forms an arc in the sky',
  'It''s caused by light refraction',
  'It has seven main colors'
], true);

-- Seed shorts
INSERT INTO shorts (locale, slug, title, video_url, preview, is_published) VALUES
('en', 'productivity-tips', '5 Productivity Hacks', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', false, true),
('en', 'mindfulness-basics', 'Mindfulness in 5 Minutes', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', false, true),
('en', 'cooking-essentials', 'Quick Cooking Tips', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', false, true);

-- Get the short IDs for quiz bank
DO $$
DECLARE
    productivity_id uuid;
    mindfulness_id uuid;
    cooking_id uuid;
BEGIN
    SELECT id INTO productivity_id FROM shorts WHERE slug = 'productivity-tips';
    SELECT id INTO mindfulness_id FROM shorts WHERE slug = 'mindfulness-basics';
    SELECT id INTO cooking_id FROM shorts WHERE slug = 'cooking-essentials';

    -- Seed quiz bank for shorts
    INSERT INTO quiz_bank (kind, ref_id, question, options, correct_index, points_award) VALUES
    ('short', productivity_id, 'What was the first productivity tip mentioned?', ARRAY['Time blocking', 'Email batching', 'Task prioritization', 'Break scheduling'], 0, 5),
    ('short', productivity_id, 'How long should you focus before taking a break?', ARRAY['15 minutes', '25 minutes', '45 minutes', '60 minutes'], 1, 5),
    
    ('short', mindfulness_id, 'What is the key to mindfulness practice?', ARRAY['Deep thinking', 'Present moment awareness', 'Future planning', 'Past reflection'], 1, 5),
    ('short', mindfulness_id, 'How long should beginners meditate?', ARRAY['1-2 minutes', '5-10 minutes', '15-20 minutes', '30+ minutes'], 1, 5),
    
    ('short', cooking_id, 'What should you prepare before cooking?', ARRAY['Music playlist', 'All ingredients', 'Phone calls', 'Social media'], 1, 5),
    ('short', cooking_id, 'Which knife technique was demonstrated?', ARRAY['Julienne', 'Brunoise', 'Chiffonade', 'Basic chopping'], 3, 5);
END $$;
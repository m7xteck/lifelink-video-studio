# Graph Report - lifelink-course  (2026-11-23)

## Corpus Check
- Corpus is ~4,465 words - fits in a single context window. You may not need a graph.

## Summary
- 85 nodes · 131 edges · 8 communities
- Extraction: 86% EXTRACTED · 13% INFERRED · 1% AMBIGUOUS · INFERRED: 17 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Character in Action and Mirror Check
- Covenant, Culture and Lasting Foundations
- Modern Pressures and Marriage Myths
- Partnership, Control and Safeguarding
- Divine Purpose and Marital Ecosystem
- Course Frame and Private Character
- Three Pillars: Sakina, Mawaddah, Rahmah
- Applied Scenarios and Reflection

## God Nodes (most connected - your core abstractions)
1. `Module 1: The Sacred Purpose of Marriage` - 19 edges
2. `The Mirror Check` - 10 edges
3. `Dimensions of a Healthy Marriage` - 8 edges
4. `Three Pillars: Sakina, Mawaddah, Rahmah` - 7 edges
5. `Islamic Teachings vs Cultural Expectations` - 7 edges
6. `Marriage Myths` - 7 edges
7. `Marriage in a Changing World` - 6 edges
8. `Reflection Prompts to Learner` - 6 edges
9. `Four Elements of Partnership` - 5 edges
10. `Amanah (Sacred Trust / Responsibility)` - 5 edges

## Surprising Connections (you probably didn't know these)
- `End of Module Assessment` --references--> `Three Pillars: Sakina, Mawaddah, Rahmah`  [AMBIGUOUS]
  module-01-transcript.txt → module-01-transcript.txt  _Bridges community 6 → community 5_
- `Sakina (Tranquility)` --semantically_similar_to--> `Dignity and Safety`  [INFERRED] [semantically similar]
  module-01-transcript.txt → module-01-transcript.txt  _Bridges community 6 → community 3_
- `Mirror Q5: Support in difficult circumstances?` --semantically_similar_to--> `Rahmah (Mercy)`  [INFERRED] [semantically similar]
  module-01-transcript.txt → module-01-transcript.txt  _Bridges community 6 → community 4_
- `Islamic Principles: Justice, Compassion, Responsibility, Consultation` --semantically_similar_to--> `Respectful Consultation (Shura)`  [INFERRED] [semantically similar]
  module-01-transcript.txt → module-01-transcript.txt  _Bridges community 2 → community 0_
- `Connection and Individual Wellbeing` --semantically_similar_to--> `Honouring Individuality`  [INFERRED] [semantically similar]
  module-01-transcript.txt → module-01-transcript.txt  _Bridges community 3 → community 7_

## Hyperedges (group relationships)
- **Sakina-Mawaddah-Rahmah framework** — module_01_transcript_three_pillars, module_01_transcript_sakina, module_01_transcript_mawaddah, module_01_transcript_rahmah [EXTRACTED 1.00]
- **Mirror Check six self-questions** — module_01_transcript_mirror_check, module_01_transcript_mirror_q_ready, module_01_transcript_mirror_q_listen, module_01_transcript_mirror_q_mistakes, module_01_transcript_mirror_q_practical, module_01_transcript_mirror_q_support, module_01_transcript_mirror_q_boundaries [EXTRACTED 1.00]
- **Control/abuse safeguarding line** — module_01_transcript_responsibility_vs_control, module_01_transcript_coercive_control, module_01_transcript_abuse_not_islamic, module_01_transcript_forgiveness_not_ignoring_harm, module_01_transcript_faith_vs_culture [INFERRED 0.85]

## Communities (8 total, 0 thin omitted)

### Community 0 - "Character in Action and Mirror Check"
Cohesion: 0.17
Nodes (13): Accountability, Scenario: Hurtful Comment and Apology, Action: Communication, Responsibility, Cooperation, Communication, Scenario: Financial Disagreement, Emotional Maturity, The Mirror Check, Mirror Q2: Can I truly listen? (+5 more)

### Community 1 - "Covenant, Culture and Lasting Foundations"
Cohesion: 0.14
Nodes (15): Amanah (Sacred Trust / Responsibility), Compatibility, Respect, Kindness, Trust Remain Constant, Core Foundation: Faith, Respect, Trust, Cultural Differences, Expensive Wedding Pressure, Islamic Teachings vs Cultural Expectations, Household Responsibilities (+7 more)

### Community 2 - "Modern Pressures and Marriage Myths"
Cohesion: 0.17
Nodes (11): Changing Roles and Responsibilities, Financial Realities, Islamic Principles: Justice, Compassion, Responsibility, Consultation, Marriage in a Changing World, Myth: Spouse Should Automatically Know What We Need, Myth: Successful Couples Never Disagree, Myth: Marriage Solves Personal Problems, Myth: Spouse Will Change Completely (+3 more)

### Community 3 - "Partnership, Control and Safeguarding"
Cohesion: 0.18
Nodes (11): Abuse Is Not Islamic Responsibility, Coercive Control, Dignity and Safety, Four Elements of Partnership, Honouring Individuality, Mirror Q6: Respect boundaries and independence?, Mutual Support, Partnership Rather Than Competition (+3 more)

### Community 4 - "Divine Purpose and Marital Ecosystem"
Cohesion: 0.20
Nodes (10): Companionship and Belonging, Dimensions of a Healthy Marriage, Divine Purpose of Marriage, Emotional and Practical Support, Strengthening Faith and Character, Lawful Intimacy and Faith (centre), Marital Ecosystem, Mirror Q5: Support in difficult circumstances? (+2 more)

### Community 5 - "Course Frame and Private Character"
Cohesion: 0.32
Nodes (7): 18 Compulsory Modules, End of Module Assessment, Hadith: Best of You Are Best to Their Wives, LifeLink Marriage Academy, Module 1: The Sacred Purpose of Marriage, Module 2: Finding the Right Life Partner, Private vs Public Character

### Community 6 - "Three Pillars: Sakina, Mawaddah, Rahmah"
Cohesion: 0.33
Nodes (7): Scenario: Appreciation after a demanding day, Emotional Security, Grace and Repair: Compassion, Patience, Appreciation, Forgiveness, Mawaddah (Affection), Rahmah (Mercy), Sakina (Tranquility), Three Pillars: Sakina, Mawaddah, Rahmah

### Community 7 - "Applied Scenarios and Reflection"
Cohesion: 0.29
Nodes (7): Scenario: Family Visits vs Couple Time, Connection and Individual Wellbeing, Scenario: Loneliness Expectation, Myth: Spouse Will Always Make You Happy, Applied Scenarios (Family Time, Loneliness), Reflection Prompts to Learner, Expectations Sort: Islamic / Cultural / Personal Preference

## Ambiguous Edges - Review These
- `Three Pillars: Sakina, Mawaddah, Rahmah` → `End of Module Assessment`  [AMBIGUOUS]
  module-01-transcript.txt · relation: references

## Knowledge Gaps
- **12 isolated node(s):** `Emotional Security`, `Lawful Intimacy and Faith (centre)`, `Companionship and Belonging`, `Foundation for Raising a Family`, `Financial Realities` (+7 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 12 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Module 1: The Sacred Purpose of Marriage` connect `Course Frame and Private Character` to `Character in Action and Mirror Check`, `Covenant, Culture and Lasting Foundations`, `Modern Pressures and Marriage Myths`, `Partnership, Control and Safeguarding`, `Divine Purpose and Marital Ecosystem`, `Three Pillars: Sakina, Mawaddah, Rahmah`, `Applied Scenarios and Reflection`?**
  _High betweenness centrality (0.644) - this node is a cross-community bridge._
- **What connects `Emotional Security`, `Lawful Intimacy and Faith (centre)`, `Companionship and Belonging` to the rest of the system?**
  _12 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Covenant, Culture and Lasting Foundations` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._
- **Why does `The Mirror Check` connect `Character in Action and Mirror Check` to `Covenant, Culture and Lasting Foundations`, `Partnership, Control and Safeguarding`, `Divine Purpose and Marital Ecosystem`, `Course Frame and Private Character`, `Applied Scenarios and Reflection`?**
  _High betweenness centrality (0.158) - this node is a cross-community bridge._
- **Why does `Dimensions of a Healthy Marriage` connect `Divine Purpose and Marital Ecosystem` to `Modern Pressures and Marriage Myths`, `Partnership, Control and Safeguarding`?**
  _High betweenness centrality (0.115) - this node is a cross-community bridge._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `Three Pillars: Sakina, Mawaddah, Rahmah` and `End of Module Assessment`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
# Range Coach — research and product brief

Research date: August 13, 2026

## Product thesis

There is room for a No-Limit Hold'em study product that coaches the *decision process* rather than simulating a full game or grading every action against a solver. The smallest useful loop is:

1. Observe the line, board, position, stacks, player type and tournament context.
2. Build the opponent's range from plausible hand classes.
3. Classify how capped that range is, using a confidence level rather than a binary fact.
4. Choose a response that follows from the range and the player's likely mistakes.
5. Explain the plan, including what evidence would invalidate it.

The key product principle is **combinations before labels**. “Capped” should be a conclusion the learner earns, not a shortcut that automatically triggers a large bluff.

## Market scan

### Hungry Horse Poker

Hungry Horse is the closest conceptual reference. Its current positioning emphasizes live cash, mass-data-informed exploits, interactive coaching, and a repeatable thought process. Its official program page says Basecamp focuses on why a decision gets made and how to adapt when a new spot appears. It also explicitly excludes tournament-focused players and beginners. That creates an opening for a lower-cost, self-serve coach that supports both live cash and tournament context without duplicating Hungry Horse's material, terminology sequence, examples, or presentation.

- Official product positioning and membership/hand trainer: https://www.hungryhorsepoker.com/home
- Current Basecamp details, audience and exclusions: https://www.hungryhorsepoker.com/program-details

### Solver-first trainers

GTO Wizard, DTO Poker and RangeTrainerPro compete primarily on solved coverage, GTO accuracy, scenario volume, EV feedback, customization and repetition.

- GTO Wizard offers a large solution library, customizable ranges and bet sizes, custom drills, instant GTO/EV feedback, hand-history analysis and tournament ICM solving: https://gtowizard.com/
- DTO positions separate cash and tournament products around simplified GTO solutions and an explorer/trainer: https://www.dtopoker.com/
- RangeTrainerPro emphasizes a large pre-solved game tree, GTO-bot training and real-time feedback: https://rangetrainer.app/

These products are valuable references, but competing head-on would require expensive solver infrastructure and licensed or independently generated solution data. Range Coach should instead own the “make your reasoning visible” category.

### Content-and-quiz platforms

PokerCoaching.com combines interactive hand quizzes, video instruction, preflop charts and push/fold drills. Its app demonstrates demand for short scenario practice, but the learner still needs help transferring an answer into a repeatable live thought process.

- Product page: https://pokercoaching.com/app/

## Differentiated wedge

| Market pattern | Range Coach response |
| --- | --- |
| Solver gives the right frequency | Coach asks what range and evidence produced the action |
| Huge scenario database | Small, authored scenario library with deep branching feedback |
| Binary right/wrong score | Score the coherence of range → cap confidence → plan |
| Generic equilibrium opponent | Explicit player archetype and observed tendency |
| Cash-only exploit training | Separate live-cash and tournament context layers |
| Static video or quiz | Socratic follow-up questions and counterfactuals |

## Primary users

1. **Serious live recreational player** — plays $1/$2 to $5/$10, knows core terminology, but makes intuition-led bluffs without constructing a range.
2. **Developing tournament player** — understands preflop charts but needs help connecting stack depth, ICM and postflop range logic.
3. **Coach or study group lead** — wants to author reusable scenarios and see where a learner's reasoning chain breaks.

The first release should not target complete beginners. A short “foundations” track can be added later.

## Recommended product boundary

Range Coach is a study and reflection tool. It should not:

- deal a continuous playable poker game;
- connect to a poker client or provide real-time assistance during play;
- promise winnings or recommend stakes/bankroll risk;
- present an LLM's generated answer as solver truth;
- copy proprietary training examples, charts, course language, UI, videos or databases.

## AI coach design

Use AI as the conversational layer, not the source of strategy truth.

1. A structured scenario record holds the action, plausible hand classes, discounted branches, cap-confidence target, accepted responses, context and coach rationale.
2. A deterministic evaluator checks whether the learner kept important branches, contradicted their own classification, or chose an unsupported response.
3. The language model receives only that record plus the learner's choices. It asks Socratic questions, rewrites feedback at the learner's level and creates counterfactuals inside approved bounds.
4. A response must distinguish “baseline principle,” “population read,” and “player-specific assumption.”
5. Every exploit includes a reversal condition: what observation would make the learner stop using it.

This structure makes the app explainable, testable and substantially safer from hallucinated poker advice than asking a model to invent a strategy from scratch.

## Intellectual-property guardrails

The general ideas of range construction, capped/uncapped ranges and exploitative adjustment are poker concepts and methods. The U.S. Copyright Office explains that copyright does not protect ideas, methods or systems, while it can protect a creator's particular text, illustrations and other expression: https://www.copyright.gov/circs/circ31.pdf

Practical rules for this product:

- write every lesson, scenario, explanation and visual from scratch;
- use independently authored or properly licensed solver data if numerical strategy is introduced;
- do not scrape member-only trainers, strategy guides, hand libraries or course transcripts;
- do not market the product as affiliated with Hungry Horse, GTO Wizard, DTO or another brand;
- clear the final product name and logo before launch, because trademarks identify the source of goods or services: https://www.uspto.gov/trademarks/basics/what-trademark
- preserve research notes showing independent development;
- have counsel review commercial branding, data licenses and terms before launch.

This is a product-development recommendation, not legal advice.

## Business hypothesis

Start with a free diagnostic containing 10–15 scenarios. The diagnostic produces a “reasoning leak” profile such as range omission, cap overconfidence, sizing without fold targets, or missing ICM context. A paid plan can add scenario packs, hand-history-to-drill conversion, progress history and coach/team authoring.

The most defensible asset is not a raw quantity of hands. It is a high-quality, tagged corpus of reasoning errors, authored feedback branches and evidence-based counterfactuals.

## Research conclusion

The concept is feasible and differentiated if it remains a **reasoning coach**. A solver clone would enter a mature and infrastructure-heavy category. A copied live-exploit curriculum would create avoidable IP risk. A structured, Socratic coach for range reasoning across live cash and tournaments is both buildable and meaningfully distinct.

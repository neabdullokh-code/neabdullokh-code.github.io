# neabdullokh-code.github.io
https://neabdullokh-code.github.io/

My personal page, written as a C++ file.

- Surname → `namespace Abdusamatov`. "Abdulaziz o‘g‘li" means "son of Abdulaziz", so: `class Abdullokh : public Abdulaziz`.
- My classes at IUT are real classes: `class PhysicsExperiment : public Physics {};`
- `Mood mood = Mood::HAPPY;` is clickable. Switch it to SAD and the page loses its colors and starts to rain.
- "I have no neighbors" is a real compiler warning: `private field 'neighbors' is not used`.
- The code is real C++. With the two headers it includes (`cat iut/quarter.hpp`, `cat family/abdulaziz.hpp`),
  `clang++ -std=c++17 -Wall` compiles it with exactly that one warning and prints what ▶ Run shows.
  The folded `introduce()` opens with a click.
- The terminal also knows `help`, `whoami`, `ping neighbors`, `mood sad`, `ls`.

Plain HTML, CSS and JavaScript. No frameworks, no build step.
